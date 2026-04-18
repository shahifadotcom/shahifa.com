import { useState, useEffect } from 'react';
import { CountryService, Country } from '@/services/countryService';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export const useCountryDetection = () => {
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [allCountries, setAllCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsSelection, setNeedsSelection] = useState(false);
  const { countryCode } = useParams<{ countryCode: string }>();
  const location = useLocation();

  useEffect(() => {
    const initializeCountry = async () => {
      try {
        setLoading(true);

        // Fetch all available countries
        const countries = await CountryService.getAllCountries();
        setAllCountries(countries);

        // Read admin setting: country selection enabled?
        let selectionEnabled = true;
        try {
          const { data: settings } = await supabase
            .from('store_settings')
            .select('country_selection_enabled')
            .limit(1)
            .maybeSingle();
          if (settings && typeof (settings as any).country_selection_enabled === 'boolean') {
            selectionEnabled = (settings as any).country_selection_enabled;
          }
        } catch (e) {
          console.warn('Could not read country_selection_enabled setting, defaulting to enabled');
        }

        let countryToSet: Country | null = null;

        // Priority 1: Country from URL
        if (countryCode) {
          countryToSet = countries.find(c => c.code.toLowerCase() === countryCode.toLowerCase()) || null;
        }

        // Priority 2: Saved country preference
        if (!countryToSet) {
          const savedCountryCode = localStorage.getItem('selectedCountry');
          if (savedCountryCode) {
            countryToSet = countries.find(c => c.code === savedCountryCode) || null;
          }
        }

        // Priority 3: If selection is disabled, auto-detect via IP
        if (!countryToSet && !selectionEnabled) {
          try {
            const detected = await CountryService.detectCountryByIP();
            if (detected) {
              countryToSet = countries.find(c => c.code === detected.code) || detected;
            }
          } catch (e) {
            console.warn('IP-based country detection failed:', e);
          }

          // Final fallback: default country (e.g., BD) or first available
          if (!countryToSet) {
            const defaultCountry = await CountryService.getDefaultCountry();
            countryToSet = defaultCountry || countries[0] || null;
          }
        }

        if (countryToSet) {
          setSelectedCountry(countryToSet);
          setNeedsSelection(false);
        } else if (selectionEnabled) {
          // No country resolved AND selection is enabled → show modal
          setNeedsSelection(true);
        } else {
          setNeedsSelection(false);
        }

      } catch (err) {
        console.error('Country initialization failed:', err);
        setError('Failed to load countries');
      } finally {
        setLoading(false);
      }
    };

    initializeCountry();
  }, [countryCode]);

  // Manually select a country
  const selectCountry = (country: Country | null) => {
    setSelectedCountry(country);
    setNeedsSelection(false);
    
    // Save preference to localStorage
    if (country) {
      localStorage.setItem('selectedCountry', country.code);
    } else {
      localStorage.removeItem('selectedCountry');
    }
  };

  return {
    selectedCountry,
    allCountries,
    loading,
    error,
    needsSelection,
    selectCountry,
    // Utility functions
    countryName: selectedCountry?.name || 'Unknown',
    countryCode: selectedCountry?.code || '',
    countryId: selectedCountry?.id || '',
    currency: selectedCountry?.currency || 'USD'
  };
};
