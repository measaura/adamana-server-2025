<?php

namespace App\Models;

use App\Models\User;
// use App\Models\Tracking;
use Illuminate\Database\Eloquent\Model;

class Device extends Model
{
    // use Hashidable;

    protected $hidden = [
        'id',
        'user_id',
    ];
    protected $fillable = [
        'code',
        'imei',
        'device_id',
        'interval',
        'group_id',
    ];
}
