<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('devices', function (Blueprint $table) {
            $table->unsignedInteger('id')->autoIncrement()->primary();
            $table->string('code')->unique();
            $table->string('imei')->unique();
            $table->string('device_id')->unique();
            $table->integer('user_id')->nullable();
            $table->string('phone')->nullable();
            $table->boolean('auto_answer')->default(false);
            $table->boolean('report_calling_location')->default(false);
            $table->boolean('reserve_emergency_power')->default(false);
            $table->boolean('report_location')->default(true);
            $table->boolean('protect_from_stranger')->default(false);
            $table->integer('battery')->nullable();
            $table->boolean('push')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('devices');
    }
};
