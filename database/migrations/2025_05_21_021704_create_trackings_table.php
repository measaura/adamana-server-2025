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
        Schema::create('trackings', function (Blueprint $table) {
            $table->unsignedInteger('id')->autoIncrement()->primary();
            $table->unsignedInteger('device_id');
            
            // Rest of your columns (unchanged)
            $table->string('latitude')->nullable();
            $table->string('longitude')->nullable();
            $table->string('type');
            $table->integer('battery')->nullable();
            $table->text('data')->nullable();
            $table->string('code')->nullable();
            $table->dateTime('tracked_at')->nullable();
            $table->string('location')->nullable();
            $table->string('range')->nullable();
            $table->string('mode')->nullable();
            $table->timestamps();
            
            // Foreign key (same as Laravel 5)
            $table->foreign('device_id')
                ->references('id')
                ->on('devices')
                ->onDelete('cascade')
                ->onUpdate('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('trackings');
    }
};
