
import React, { useState, useEffect, useRef } from 'react';
import { Input } from './ui';
import { MapPin } from 'lucide-react';

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
  placeholder?: string;
}

// A curated list of major North American cities for suggestions
const MAJOR_CITIES = [
  // Canada
  "Toronto, ON", "Montreal, QC", "Vancouver, BC", "Calgary, AB", "Edmonton, AB", 
  "Ottawa, ON", "Winnipeg, MB", "Quebec City, QC", "Hamilton, ON", "Kitchener, ON",
  "London, ON", "Victoria, BC", "Halifax, NS", "Oshawa, ON", "Windsor, ON",
  "Saskatoon, SK", "Mississauga, ON", "Brampton, ON", "Markham, ON",
  
  // USA
  "New York, NY", "Los Angeles, CA", "Chicago, IL", "Houston, TX", "Phoenix, AZ",
  "Philadelphia, PA", "San Antonio, TX", "San Diego, CA", "Dallas, TX", "San Jose, CA",
  "Austin, TX", "Jacksonville, FL", "Fort Worth, TX", "Columbus, OH", "San Francisco, CA",
  "Charlotte, NC", "Indianapolis, IN", "Seattle, WA", "Denver, CO", "Washington, DC",
  "Boston, MA", "El Paso, TX", "Nashville, TN", "Detroit, MI", "Portland, OR",
  "Las Vegas, NV", "Memphis, TN", "Louisville, KY", "Baltimore, MD", "Milwaukee, WI",
  "Albuquerque, NM", "Tucson, AZ", "Fresno, CA", "Sacramento, CA", "Kansas City, MO",
  "Atlanta, GA", "Miami, FL", "Raleigh, NC", "Minneapolis, MN", "Cleveland, OH"
];

export const CityAutocomplete: React.FC<CityAutocompleteProps> = ({ 
  value, 
  onChange, 
  className,
  id,
  placeholder 
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    onChange(query);

    if (query.length > 1) {
      const filtered = MAJOR_CITIES.filter(city => 
        city.toLowerCase().includes(query.toLowerCase())
      );
      setSuggestions(filtered);
      setIsOpen(true);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  };

  const handleSelect = (city: string) => {
    onChange(city);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <Input
        id={id}
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={className}
        onFocus={() => {
          if (value.length > 1 && suggestions.length > 0) setIsOpen(true);
        }}
        autoComplete="off"
      />
      
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none text-sm">
          {suggestions.map((city, index) => (
            <li
              key={index}
              className="relative cursor-pointer select-none py-2 pl-3 pr-9 hover:bg-slate-100 text-slate-900 flex items-center gap-2"
              onClick={() => handleSelect(city)}
            >
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              {city}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
