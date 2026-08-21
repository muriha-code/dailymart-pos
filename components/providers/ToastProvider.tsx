"use client";

import React from "react";
import { Toaster } from "react-hot-toast";

export default function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      reverseOrder={false}
      gutter={8}
      containerStyle={{
        top: 24,
      }}
      toastOptions={{
        duration: 3500,
        style: {
          background: "#0F172A",
          color: "#F8FAFC",
          fontSize: "13px",
          fontWeight: 600,
          borderRadius: "14px",
          padding: "12px 18px",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow:
            "0 20px 25px -5px rgba(15, 23, 42, 0.4), 0 8px 10px -6px rgba(15, 23, 42, 0.3)",
        },
        success: {
          duration: 3500,
          iconTheme: {
            primary: "#10B981",
            secondary: "#0F172A",
          },
        },
        error: {
          duration: 4500,
          iconTheme: {
            primary: "#EF4444",
            secondary: "#0F172A",
          },
        },
      }}
    />
  );
}
