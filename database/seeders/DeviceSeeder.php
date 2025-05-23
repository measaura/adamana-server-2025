<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Device;

class DeviceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Device::create([
            'code' => '862909782688704',
            'imei' => '352662098268700',
            'device_id' => '6209826870',
            // add other fields as needed
        ]);
        Device::create([
            'code' => '162609782608713',
            'imei' => '352662098268718',
            'device_id' => '6209826871',
            // add other fields as needed
        ]);
        Device::create([
            'code' => '462309682628725',
            'imei' => '352662098268726',
            'device_id' => '6209826872',
            // add other fields as needed
        ]);
        Device::create([
            'code' => '762009582648738',
            'imei' => '352662098268734',
            'device_id' => '6209826873',
            // add other fields as needed
        ]);
        //
    }
}
