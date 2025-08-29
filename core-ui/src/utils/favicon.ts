/**
 * Utility functions for managing dynamic favicon loading
 */

export const updateFavicon = (faviconUrl: string): void => {
  // Remove existing favicon links
  const existingLinks = document.querySelectorAll("link[rel*='icon']");
  existingLinks.forEach(link => link.remove());

  // Create new favicon link
  const link = document.createElement('link');
  link.type = 'image/png';
  link.rel = 'icon';
  link.href = faviconUrl;
  
  // Add to document head
  document.head.appendChild(link);
};

export const loadFaviconFromAPI = async (): Promise<void> => {
  try {
    // Try to load favicon from API with cache busting
    const cacheBuster = Date.now();
    const faviconUrl = `/api/v1/site-settings/favicon?t=${cacheBuster}`;
    
    // Test if the favicon exists by making a GET request
    const response = await fetch(faviconUrl, { 
      method: 'GET',
      headers: {
        'Accept': 'image/*'
      }
    });
    
    if (response.ok) {
      updateFavicon(faviconUrl);
    } else if (response.status === 404) {
      // Fallback to static favicon if API doesn't have one
      updateFavicon('/favicon.png');
    } else {
      updateFavicon('/favicon.png');
    }
  } catch (error) {
    // Fallback to static favicon
    updateFavicon('/favicon.png');
  }
};

export const preloadFaviconAndLogo = async (): Promise<void> => {
  try {
    // Add a small delay to ensure API is ready
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Preload favicon
    await loadFaviconFromAPI();
    
    // Preload logo (optional - for header background)
    const cacheBuster = Date.now();
    const logoUrl = `/api/v1/site-settings/logo?t=${cacheBuster}`;
    
    // Test if logo exists
    try {
      const logoResponse = await fetch(logoUrl, { method: 'HEAD' });
      if (logoResponse.ok) {
        // Preload the logo image
        const img = new Image();
        img.src = logoUrl;
      }
    } catch (logoError) {
      // Logo doesn't exist or failed to load - this is fine
    }
  } catch (error) {
    // Failed to preload assets - this is fine
  }
};
