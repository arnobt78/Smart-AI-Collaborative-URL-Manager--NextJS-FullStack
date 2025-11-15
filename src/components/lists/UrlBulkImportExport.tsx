"use client";

import { Button } from "@/components/ui/Button";
import React from "react";

interface UrlBulkImportExportProps {
  handleExport: (type: "json" | "csv") => void;
  handleImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function UrlBulkImportExport({
  handleExport,
  handleImport,
}: UrlBulkImportExportProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-2 items-center">
      <span className="font-semibold text-gray-700 mr-2">Import/Export:</span>
      <Button
        type="button"
        onClick={() => handleExport("json")}
        className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-semibold"
      >
        Export JSON
      </Button>
      <Button
        type="button"
        onClick={() => handleExport("csv")}
        className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-semibold"
      >
        Export CSV
      </Button>
      <label className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-semibold cursor-pointer">
        Import JSON/CSV
        <input
          type="file"
          accept=".json,.csv"
          onChange={handleImport}
          className="hidden"
        />
      </label>
    </div>
  );
}
