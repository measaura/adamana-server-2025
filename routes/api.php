<?php
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\TrackingController;

Route::post('/updatedevice', [TrackingController::class, 'updateDevice']);
Route::post('/promise', [TrackingController::class, 'handlePromise']);