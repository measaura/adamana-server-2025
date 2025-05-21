<?php

namespace App\Http\Controllers;

use App\Device;
use App\Tracking;
use Carbon\Carbon;
use GuzzleHttp\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TrackingController extends Controller
{
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

        $data = $request->input('data');
        $dataArr = explode(',', $data);

        $code = $dataArr[0];
        $date = $dataArr[1];
        $time = $dataArr[2];
        $locStat = $dataArr[3];
        $lat = $dataArr[4];
        $lng = $dataArr[6];
        $battery = $dataArr[13] ?? null;
        $terminal = $dataArr[16] ?? null;

        $mode = 'GPS';
        $range = $dataArr[count($dataArr) - 1] ?? null;

        if ($locStat === 'V') {
            // Handle invalid location using cell tower or WiFi triangulation
            $result = $this->processNoPos($dataArr);
            if ($result) {
                if ($result[0]) {
                    $lat = $result[0]->location->lat;
                    $lng = $result[0]->location->lng;
                    $range = $result[0]->accuracy;
                }
                if ($result[1]) {
                    $mode = $result[1]; // Either 'WIFI' or 'LBS'
                }
            } else {
                Log::info('Failed to retrieve location from triangulation.');
                return response()->json(['error' => 'Invalid location data'], 400);
            }
        }

        $trackedAt = Carbon::createFromFormat('dmyHis', $date . $time);
        $location = $this->getLocationName($lat, $lng);

        Tracking::create([
            'device_id'  => $device->id,
            'latitude'   => $lat,
            'longitude'  => $lng,
            'battery'    => $battery,
            'code'       => $code,
            'data'       => $data,
            'tracked_at' => $trackedAt,
            'location'   => $location,
            'range'      => $range,
            'mode'       => $mode,
        ]);

        $device->battery = $battery;
        $device->save();

        Log::info("Device {$device->device_id} updated successfully.");
        return response()->json(['message' => 'Device updated successfully'], 200);
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