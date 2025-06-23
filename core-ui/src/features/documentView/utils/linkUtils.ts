// utils/linkUtils.ts

/**
 * Validates if a URL is properly formatted
 */
export const isValidUrl = (url: string): boolean => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

/**
 * Formats a URL by adding https:// if no protocol is specified
 */
export const formatUrl = (url: string): string => {
    if (!url.trim()) return '';
    
    // If URL already has a protocol, return as is
    if (url.match(/^https?:\/\//)) {
        return url;
    }
    
    // Add https:// if no protocol
    return `https://${url}`;
};

/**
 * Extracts all markdown links from text
 */
export const extractMarkdownLinks = (text: string): Array<{ text: string; url: string; fullMatch: string }> => {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const links = [];
    let match;
    
    while ((match = linkRegex.exec(text)) !== null) {
        links.push({
            text: match[1],
            url: match[2],
            fullMatch: match[0]
        });
    }
    
    return links;
};

/**
 * Validates all links in markdown text
 */
export const validateMarkdownLinks = (text: string): Array<{ text: string; url: string; isValid: boolean }> => {
    const links = extractMarkdownLinks(text);
    return links.map(link => ({
        ...link,
        isValid: isValidUrl(link.url)
    }));
};

/**
 * Converts plain text with markdown links to HTML
 */
export const markdownLinksToHtml = (text: string): string => {
    return text.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );
};

/**
 * Strips markdown link formatting, leaving just the text
 */
export const stripMarkdownLinks = (text: string): string => {
    return text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
};

/**
 * Converts HTML links back to markdown format
 */
export const htmlLinksToMarkdown = (html: string): string => {
    return html.replace(
        /<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g,
        '[$2]($1)'
    );
};