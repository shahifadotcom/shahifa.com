import { useState, useEffect } from 'react';
import { CountryService, Country } from '@/services/countryService';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const COUNTRY_COOKIE = 'selectedCountry';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

const readCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
};

const writeCookie = (name: string, value: string) => {
  if (typeof document === 'undefined') return;
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
};

const clearCookie = (name: string) => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; Max-Age=0; Path=/`;
};

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

        // Priority 3: Always auto-detect via IP in the background (no modal)
        if (!countryToSet) {
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
          // Persist so subsequent visits skip detection
          try { localStorage.setItem('selectedCountry', countryToSet.code); } catch {}
        }
        // Never prompt the user to select a country
        setNeedsSelection(false);

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
