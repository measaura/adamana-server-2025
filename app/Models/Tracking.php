<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Tracking extends Model
{
    //use Hashidable;

    protected $fillable = [
        'type', 
        'latitude',
        'longitude',
        'device_id',
        'battery',
        'data',
        'code',
        'tracked_at',
        'location',
        'range',
        'mode'
    ];
    protected $hidden = [
        'id',
        'device_id',
    ]; 

    public function device()
    {
        return $this->belongsTo(Device::class, 'device_id', 'device_id');
    }

    protected $appends = [
        'hash_id',
    ];
}
