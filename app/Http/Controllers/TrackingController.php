<?php

namespace App\Http\Controllers;

use App\Models\Device;
use App\Models\Tracking;
use Carbon\Carbon;
use GuzzleHttp\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TrackingController extends Controller
{
    public $successStatus = 200;

    public function updateDevice(Request $request)
    {
        $request->validate([
            'device_id' => 'required',
            'data'      => 'required',
        ]);

        $device = Device::where('device_id', $request->device_id)->first();

        if (!$device) {
            return response()->json(['error' => 'Device not found'], 404);
        }


        $process = $this->processData($request->input('data'), $device);
        if ($process){
            Tracking::create([
                'type'       => $process->type,
                'device_id'  => $device->id,
                'latitude'   => $process->lat,
                'longitude'  => $process->lng,
                'battery'    => $process->bat,
                'code'       => $process->code,
                'data'       => $request->input('data'),
                'tracked_at' => $process->tracked_at,
                'location'   => $process->location,
                'range'      => $process->range,
                'mode'       => $process->mode,
            ]);
            return response()->json('done', $this->successStatus);

        }

    }

    public function handlePromise(Request $request)
    {
        $request->validate([
            'device_id' => 'required',
            'code'      => 'required',
            'status'    => 'required',
        ]);

        $device = Device::where('device_id', $request->device_id)->first();

        if (!$device) {
            return response()->json(['error' => 'Device not found'], 404);
        }

        $status = $request->input('status');
        $code = $request->input('code');

        if ($status === 'send') {
            Log::info("Promise sent for device {$device->device_id} with code {$code}.");
        } elseif ($status === 'promise') {
            Log::info("Promise received for device {$device->device_id} with code {$code}.");
            $device->push = true;
            $device->save();
        } elseif ($status === 'offline') {
            Log::info("Device {$device->device_id} is offline.");
        }

        return response()->json(['message' => 'Promise handled successfully'], 200);
    }

    private function processData($dataStr, Device $device)
    {
        $type = 'normal';

        // process data
        $dataArr = explode(",", $dataStr);

        $code = $dataArr[0];

        if ($code == 'LK') {
            // just update the battery of the device
            $device->battery = (int) $dataArr[3];
            $device->save();
            // $device->pushRefresh();
            return 0;
        }

        if ($code == 'AL') {
            $type = 'alarm';
        }

        $date = $dataArr[1];
        $time = $dataArr[2];

        $locStat = $dataArr[3];

        $lat = $dataArr[4];
        if ($dataArr[5] == 'S') {
            $lat = -$dataArr[4];
        }

        $lng = $dataArr[6];

        $mode  = 'GPS';
        $range = $dataArr[count($dataArr) - 1];

        if ($locStat == 'V') {
            $result = $this->processNoPos($dataArr);
            if ($result) {
                // Log::info('resutl');
                // Log::info(print_r($result, true));
                if ($result[0]) {
                    $lat   = $result[0]->location->lat;
                    $lng   = $result[0]->location->lng;
                    $range = $result[0]->accuracy;
                }
                if ($result[1]) {
                    $mode = $result[1];
                }
            }
        }

        $bat = $dataArr[13];

        $device->battery = (int) $bat;
        $device->save();

        $terminal = $dataArr[16];
				
        // new method to translate terminal status
        $type .= $this->terminalprocess($terminal);

        $tracked_at = Carbon::createFromFormat('dmyHis', $date . $time);

        $location = $this->getLocationName($lat, $lng);

        if ($code == 'AL') {
            // send to dashboard notification
            $this->broadcastAlarm($device, $terminal, $tracked_at, $location);
        }

        if ($device->push && $code == 'UD' && $locStat == 'A') {
            $this->pushToDevice($device, 'Refresh', 'Device location updated');

            $device->push = false;
            $device->update();
        } else if ($code == 'UD' && $mode != 'LBS') {
            // $device->pushRefresh();
        }

        return (object) [
            'type'       => $type, 'lat'            => $lat, 'lng'    => $lng,
            'bat'        => $bat, 'code'            => $code, 'range' => $range,
            'tracked_at' => $tracked_at, 'location' => $location,
            'mode'       => $mode,
        ];
    }

    private function hex2binary($hex) {
        $str=base_convert($hex,16,2);
        return str_pad($str,16,"0",STR_PAD_LEFT);
    }
		
    private function terminalprocess($terminalstats) {
      $hi = substr($terminalstats, 0, 4);
			$lo = substr($terminalstats, 4, 4);
			$term = $this->hex2binary($hi) . $this->hex2binary($lo);
			$b = str_split($term);
			$ts = array_reverse($b);
      $res = "";
      $type = "";
      if ($ts[0] == 1){
      	$res .= "Low Batt State, ";
				$type .= '+lowbattery';
      }
      if ($ts[1] == 1){
      	$res .= "Out Of Fence State, ";
				$type .= '+exitzone';
			}
      if ($ts[2] == 1){
				$res .= "Into Fence State, ";
				$type .= '+enterzone';
      }
      if ($ts[3] == 1){ 
      	$res .= "Watch Removed State, ";
      	$type .= '+watchremove';
      }
      if ($ts[16] == 1){ 
      	$res .= "SOS Alert, ";
      	$type .= '+sos';
      }
      if ($ts[17] == 1){ 
      	$res .= "Low Batt Alert, ";
        $type .= '+notification';
      }
      if ($ts[18] == 1){ 
      	$res .= "Out Of Fence Alert, ";
      	$type .= '+notification';
      }
      if ($ts[19] == 1){ 
      	$res .= "Into Fence Alert, ";
      	$type .= '+notification';
      }
      if ($ts[20] == 1){ 
      	$res .= "Watch Removed Alert, ";
      	$type .= '+notification';
      }
    
			return $type;
    }
    
    private function terminalprocessText($terminalstats) {
      $hi = substr($terminalstats, 0, 4);
			$lo = substr($terminalstats, 4, 4);
			$term = $this->hex2binary($hi) . $this->hex2binary($lo);
			$b = str_split($term);
			$ts = array_reverse($b);
      $res = "";
      $type = "";
      if ($ts[16] == 1){ 
      	$res = " triggered SOS!";
      }
      if ($ts[17] == 1){ 
      	$res = "'s battery low power.";
      }
      if ($ts[18] == 1){ 
      	$res = " is exiting the geofence.";
      }
      if ($ts[19] == 1){ 
      	$res = " is entering the geofence.";
      }
      if ($ts[20] == 1){ 
      	$res = " watch is taken off.";
      }
    
			return $res;
    }

    private function processNoPos($dataArr)
    {
        $noOfTowers = $dataArr[17];
        $timing = $dataArr[18];
        $countryCode = $dataArr[19];
        $networkCode = $dataArr[20];

        $towers = [];
        $counter = 20;
        for ($i = 0; $i < $noOfTowers; $i++) {
            $towers[$i] = [
                'locationAreaCode'  => $dataArr[$counter + 1],
                'cellId'            => $dataArr[$counter + 2],
                'signalStrength'    => $dataArr[$counter + 3],
                'mobileCountryCode' => $countryCode,
                'mobileNetworkCode' => $networkCode,
                'age'               => 0,
                'timingAdvance'     => $timing,
            ];
            $counter += 3;
        }

        $noOfWifis = $dataArr[$counter + 1] ?? 0;
        $wifis = [];
        if ($noOfWifis) {
            $counter -= 2;
            for ($i = 0; $i < $noOfWifis; $i++) {
                $counter += 3;
                if (!in_array($dataArr[$counter + 2], ['2c:c5:d3:63:e1:78', 'f0:c8:50:e9:6b:8a', 'f0:c8:50:e9:6d:2e'])) {
                    $wifis[] = [
                        'macAddress'         => $dataArr[$counter + 2],
                        'signalStrength'     => $dataArr[$counter + 3],
                        'signalToNoiseRatio' => 0,
                    ];
                } else {
                    Log::info('Excluded Celcom router.');
                }
            }
        }

        $url = sprintf('https://www.googleapis.com/geolocation/v1/geolocate?key=%s', config('app.google_key'));
        $client = new Client();

        $dataWifi = null;
        if (!empty($wifis)) {
            try {
                $params = [
                    'considerIp'       => 'false',
                    'wifiAccessPoints' => $wifis,
                ];
                $result = $client->post($url, ['json' => $params]);
                $dataWifi = json_decode($result->getBody()->getContents());
            } catch (\Exception $e) {
                Log::error('Error fetching WiFi location: ' . $e->getMessage());
            }
        }

        try {
            $params = [
                'cellTowers' => $towers,
            ];
            $result = $client->post($url, ['json' => $params]);
            $dataTower = json_decode($result->getBody()->getContents());

            if ($dataWifi && $dataWifi->accuracy < $dataTower->accuracy) {
                return [$dataWifi, 'WIFI'];
            }

            return [$dataTower, 'LBS'];
        } catch (\Exception $e) {
            Log::error('Error fetching cell tower location: ' . $e->getMessage());
        }

        return null;
    }

    private function getLocationName($lat, $lng)
    {
        $url = sprintf(
            'https://maps.googleapis.com/maps/api/geocode/json?latlng=%s,%s&key=%s',
            $lat,
            $lng,
            config('app.google_key')
        );

        try {
            $client = new Client();
            $response = $client->get($url);
            $data = json_decode($response->getBody()->getContents());

            if (!empty($data->results)) {
                return $data->results[0]->formatted_address;
            }
        } catch (\Exception $e) {
            Log::error('Error fetching location name: ' . $e->getMessage());
        }

        return 'Unknown';
    }
}