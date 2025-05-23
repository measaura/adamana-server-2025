<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\TrackingController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::post('/updatedevice', [TrackingController::class, 'updateDevice']);
Route::post('/promise', [TrackingController::class, 'handlePromise']);