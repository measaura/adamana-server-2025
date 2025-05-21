<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');
    Route::get('main-map', function () {
        return Inertia::render('main-map');
    })->name('main-map');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
