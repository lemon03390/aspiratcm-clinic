"use client";
import React from 'react';
import PatientForm from './components/PatientForm';

export default function PatientRegistrationPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-center mb-8">患者登記系統</h1>
      <PatientForm />
    </div>
  );
} 