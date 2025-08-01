import React, { useState, useEffect } from 'react';
import SearchBar from './SearchBar.tsx';
import IIIFControls from './IIIFControls.tsx';
import { APP_NAME, SHOW_LOGO } from '../config/appConfig.ts';

interface HeaderProps {
  onSearch: (query: string) => void;
  autocompleteUrl: string;
  currentIndex: number;
  totalImages: number;
  totalManifests: number;
  selectedManifestIndex: number;
  onPreviousImage: () => void;
  onNextImage: () => void;
  onPreviousManifest: () => void;
  onNextManifest: () => void;
  resetImageIndex: () => void;
  onLanguageChange: (lang: string) => void;
  selectedLanguage: string | null;
  searching: boolean;
  availableLanguages: Array<{ code: string; name: string }>;
}

const Header: React.FC<HeaderProps> = ({
  onSearch,
  currentIndex,
  totalImages,
  totalManifests,
  selectedManifestIndex,
  onPreviousImage,
  onNextImage,
  onPreviousManifest,
  onNextManifest,
  resetImageIndex,
  autocompleteUrl,
  onLanguageChange,
  selectedLanguage,
  searching = false,
  availableLanguages,
}) => {
  // Initialize languageIndex to selectedLanguage or first available
  const initialIndex = availableLanguages.findIndex(
    (lang) => lang.code === selectedLanguage,
  );
  const [languageIndex, setLanguageIndex] = useState(
    initialIndex >= 0 ? initialIndex : 0,
  );

  useEffect(() => {
    // Update index if selectedLanguage changes
    const idx = availableLanguages.findIndex(
      (lang) => lang.code === selectedLanguage,
    );
    if (idx !== languageIndex && idx >= 0) {
      setLanguageIndex(idx);
    }
  }, [selectedLanguage, availableLanguages, languageIndex]);

  const currentLanguage = availableLanguages[languageIndex];

  const toggleLanguage = () => {
    const nextIndex = (languageIndex + 1) % availableLanguages.length;
    setLanguageIndex(nextIndex);
    onLanguageChange(availableLanguages[nextIndex].code);
  };

  return (
    <header className="bg-gray-800 text-white p-2 flex items-center justify-between">
      <div className="flex items-center">
        {SHOW_LOGO && (
          <img
            src={`${process.env.PUBLIC_URL}/logo.svg`}
            alt="Logo"
            className="h-12 w-12"
          />
        )}
        <span className="text-lg font-semibold ml-2">{APP_NAME}</span>
      </div>

      <IIIFControls
        currentIndex={currentIndex}
        totalImages={totalImages}
        totalManifests={totalManifests}
        selectedManifestIndex={selectedManifestIndex}
        onPreviousImage={onPreviousImage}
        onNextImage={onNextImage}
        onPreviousManifest={onPreviousManifest}
        onNextManifest={onNextManifest}
        resetImageIndex={resetImageIndex}
      />

      <div className="flex items-center space-x-2">
        <button
          onClick={toggleLanguage}
          className="bg-slate-600 text-white px-2 py-1 rounded text-sm hover:bg-slate-500"
          title={currentLanguage?.name}
        >
          {currentLanguage?.code?.toUpperCase()}
        </button>
        <SearchBar
          onSearch={onSearch}
          autocompleteService={autocompleteUrl}
          searching={searching}
          selectedLanguage={selectedLanguage}
        />
      </div>
    </header>
  );
};

export default Header;
