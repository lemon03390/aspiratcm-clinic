import React, { useState, useEffect } from 'react';
import { RegionsData } from '../types';

interface RegionSelectorProps {
  regions: RegionsData;
  value: {
    region: string;
    district: string;
    subDistrict: string;
  };
  onChange: (value: { region: string; district: string; subDistrict: string }) => void;
  required?: boolean;
}

const RegionSelector: React.FC<RegionSelectorProps> = ({
  regions,
  value,
  onChange,
  required = false,
}) => {
  const [availableDistricts, setAvailableDistricts] = useState<string[]>([]);
  const [availableSubDistricts, setAvailableSubDistricts] = useState<string[]>([]);

  // 當選擇的區域變更時，更新可用的地區列表
  useEffect(() => {
    if (value.region && regions[value.region]) {
      const districts = Object.keys(regions[value.region]);
      setAvailableDistricts(districts);

      // 如果當前選中的地區不在新的可用地區列表中，重置地區選擇
      if (districts.length > 0 && !districts.includes(value.district)) {
        onChange({
          ...value,
          district: '',
          subDistrict: '',
        });
      }
    } else {
      setAvailableDistricts([]);
      setAvailableSubDistricts([]);
    }
  }, [value.region, regions]);

  // 當選擇的地區變更時，更新可用的細分地區列表
  useEffect(() => {
    if (value.region && value.district && 
        regions[value.region] && 
        regions[value.region][value.district]) {
      const subDistricts = regions[value.region][value.district];
      setAvailableSubDistricts(subDistricts);

      // 如果當前選中的細分地區不在新的可用細分地區列表中，重置細分地區選擇
      if (subDistricts.length > 0 && !subDistricts.includes(value.subDistrict)) {
        onChange({
          ...value,
          subDistrict: '',
        });
      }
    } else {
      setAvailableSubDistricts([]);
    }
  }, [value.region, value.district, regions]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 區域選擇 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          區域 {required && <span className="text-red-500">*</span>}
        </label>
        <select
          value={value.region}
          onChange={(e) => {
            onChange({
              region: e.target.value,
              district: '',
              subDistrict: '',
            });
          }}
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          required={required}
        >
          <option value="">請選擇區域</option>
          {Object.keys(regions).map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </select>
      </div>

      {/* 地區選擇 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          地區 {required && <span className="text-red-500">*</span>}
        </label>
        <select
          value={value.district}
          onChange={(e) => {
            onChange({
              ...value,
              district: e.target.value,
              subDistrict: '',
            });
          }}
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          disabled={!value.region || availableDistricts.length === 0}
          required={required}
        >
          <option value="">請選擇地區</option>
          {availableDistricts.map((district) => (
            <option key={district} value={district}>
              {district}
            </option>
          ))}
        </select>
      </div>

      {/* 細分地區選擇 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          細分地區 {required && <span className="text-red-500">*</span>}
        </label>
        <select
          value={value.subDistrict}
          onChange={(e) => {
            onChange({
              ...value,
              subDistrict: e.target.value,
            });
          }}
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          disabled={!value.district || availableSubDistricts.length === 0}
          required={required}
        >
          <option value="">請選擇細分地區</option>
          {availableSubDistricts.map((subDistrict) => (
            <option key={subDistrict} value={subDistrict}>
              {subDistrict}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default RegionSelector; 