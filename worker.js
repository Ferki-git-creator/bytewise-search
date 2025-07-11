// worker.js - Web Worker for ByteWise Search

// Initial curated MOCK_DATA (will be combined with generated data)
// This simulates specific, high-quality "community contributions" for known queries.
const CURATED_MOCK_DATA = {
    // Specific, high-priority queries with curated results
    "weather lebedyn sumy": [
        { domain: 'meteoprog.ua', title: 'Weather in Lebedyn, Sumy region - Meteoprog', url: 'https://www.meteoprog.ua/en/weather/Lebedyn/', description: 'Current weather forecast for Lebedyn, Sumy region. Temperature, precipitation, wind.', category: 'news' },
        { domain: 'gismeteo.ua', title: 'Weather in Lebedyn for 10 days - Gismeteo', url: 'https://www.gismeteo.ua/en/weather/Lebedyn/', description: 'Detailed weather forecast in Lebedyn for 10 days. Temperature, precipitation, wind direction.', category: 'news' },
        { domain: 'sinoptik.ua', title: 'Weather Lebedyn - Sinoptik.ua', url: 'https://sinoptik.ua/en/weather-lebedyn', description: 'Accurate weather forecast for Lebedyn, Sumy region. Temperature, precipitation, wind.', category: 'news' }
    ],
    "wikipedia roses": [
        { domain: 'wikipedia.org', title: 'Rose - Wikipedia', url: 'https://en.wikipedia.org/wiki/Rose', description: 'Rose is a genus of plants of the rose family. Detailed description, species, cultivation.', category: 'science' }
    ],
    "lebedyn sumy": [
        { domain: 'wikipedia.org', title: 'Lebedyn - Wikipedia', url: 'https://en.wikipedia.org/wiki/Lebedyn', description: 'Lebedyn is a city in Ukraine, Sumy region. History, geography, population.', category: 'web' },
        { domain: 'sumy.travel', title: 'Sumy region: Lebedyn - tourist portal', url: 'https://sumy.travel/en/lebedyn/', description: 'Information about the city of Lebedyn, tourist attractions and events in Sumy region.', category: 'travel' }
    ],
    "how to learn python": [
        { domain: 'python.org', title: 'The Python Tutorial', url: 'https://docs.python.org/3/tutorial/', description: 'Official Python tutorial for beginners and experienced programmers.', category: 'code' },
        { domain: 'freecodecamp.org', title: 'Learn Python - FreeCodeCamp', url: 'https://www.freecodecamp.org/learn/scientific-computing-with-python/', description: 'Interactive Python courses and certifications.', category: 'education' },
        { domain: 'datacamp.com', title: 'Learn Python for Data Science', url: 'https://www.datacamp.com/courses/tech/python-for-data-science', description: 'Online courses to learn Python for data analysis and machine learning.', category: 'education' }
    ],
    "best travel destinations europe": [
        { domain: 'lonelyplanet.com', title: 'Europe Travel Guide - Lonely Planet', url: 'https://www.lonelyplanet.com/europe', description: 'Comprehensive travel guides for European destinations.', category: 'travel' },
        { domain: 'ricksteves.com', title: 'Rick Steves\' Europe', url: 'https://www.ricksteves.com/', description: 'Expert advice and travel tips for exploring Europe.', category: 'travel' },
        { domain: 'cntraveler.com', title: 'Top European Destinations - Condé Nast Traveler', url: 'https://www.cntraveler.com/gallery/best-places-to-visit-in-europe', description: 'Magazine\'s picks for the most beautiful places in Europe.', category: 'travel' }
    ],
    "dog breeds": [
        { domain: 'petsi.net', title: 'Dog Breeds - Petsi.net', url: 'https://petsi.net/dog-breeds', description: 'Comprehensive list and information about various dog breeds.', category: 'web' },
        { domain: 'royalcanin.com', title: 'Dog Breeds - Royal Canin', url: 'https://www.royalcanin.com/ua/dogs/breeds', description: 'Information on dog breeds, their characteristics, and nutritional needs.', category: 'web' }
    ]
};

// Synonyms for enhanced local search
const SYNONYMS = {
    'js': 'javascript',
    'py': 'python',
    'doc': 'document',
    'pic': 'picture',
    'weather': 'forecast',
    'map': 'location',
    'article': 'report',
    'study': 'research',
    'book': 'novel',
    'movie': 'film',
    'show': 'series',
    'game': 'sport',
    'travel': 'trip',
    'health': 'medicine',
    'money': 'finance',
    'code': 'programming',
    'news': 'headlines',
    'shop': 'buy',
    'learn': 'education',
    'ai': 'artificial intelligence',
    'vr': 'virtual reality',
    'ar': 'augmented reality'
};

let MOCK_DATA = {}; // This will hold combined curated, generated, and user-contributed data
let localDataLoaded = false; // Flag to indicate if mock data is loaded

// --- IndexedDB functions for Worker (to access user contributions) ---
async function initDBWorker() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('ByteWiseCache', 2); // Must match version in index.html
        
        request.onupgradeneeded = (e) => {
            // This part should ideally not run in the worker if index.html handles upgrades
            // But it's here for robustness if worker opens DB first or version mismatch
            const db = e.target.result;
            if (!db.objectStoreNames.contains('searchResults')) {
                db.createObjectStore('searchResults', { keyPath: 'query' });
            }
            if (!db.objectStoreNames.contains('userContributions')) {
                db.createObjectStore('userContributions', { keyPath: 'id', autoIncrement: true });
            }
        };
        
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

async function getUserContributionsFromDB() {
    try {
        const db = await initDBWorker();
        const tx = db.transaction('userContributions', 'readonly');
        const request = tx.objectStore('userContributions').getAll();
        return new Promise((resolve) => {
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = (e) => {
                console.error("Worker: Error getting user contributions from DB:", e.target.error);
                resolve([]);
            };
        });
    } catch (e) {
        console.error("Worker: Error initializing DB for user contributions:", e);
        return [];
    }
}

// --- Synthetic Data Generation Function ---
// This function generates data to simulate a large, diverse "community-contributed" dataset.
function generateSyntheticData(count = 20000) {
    const domains = ['example.com', 'info.net', 'blog.org', 'data.io', 'solution.dev', 'guide.co', 'resource.app', 'insights.ai', 'tech.blog', 'travel.guide', 'food.blog', 'science.news', 'health.info'];
    const categories = ['web', 'science', 'technology', 'education', 'business', 'entertainment', 'community', 'reference', 'travel', 'sports', 'music', 'recipes', 'code', 'finance', 'health', 'environment', 'images', 'videos', 'news', 'maps', 'shopping', 'books'];
    const adjectives = ['Amazing', 'New', 'Best', 'Ultimate', 'Comprehensive', 'Detailed', 'Quick', 'Simple', 'Advanced', 'Practical', 'Essential', 'Modern', 'In-depth', 'Expert', 'Beginner\'s'];
    const nouns = ['Guide', 'Tutorial', 'Analysis', 'Report', 'Overview', 'Facts', 'Tips', 'Secrets', 'Strategies', 'Innovations', 'Trends', 'Insights', 'Solutions', 'Review', 'History'];
    const topics = ['AI', 'Blockchain', 'Quantum Computing', 'Sustainable Energy', 'Space Exploration', 'Deep Learning', 'Web Development', 'Cybersecurity', 'Biotechnology', 'Climate Change', 'Robotics', 'Virtual Reality', 'Augmented Reality', 'Genetics', 'Nanotechnology', 'Renewable Resources', 'Smart Cities', 'Digital Marketing', 'Financial Markets', 'Global Economy', 'Fitness', 'Nutrition', 'Mental Health', 'Travel Photography', 'Budget Travel', 'Classical Music', 'Jazz History', 'Vegetarian Cooking', 'Vegan Recipes', 'Python Basics', 'JavaScript Frameworks', 'Cloud Computing', 'Data Science', 'Machine Learning', 'Ethical Hacking', 'Environmental Policy', 'Wildlife Conservation', 'Social Media Trends', 'Community Building', 'Leadership Skills', 'Startup Growth', 'Investment Strategies', 'Personal Finance', 'Ancient History', 'Modern Art', 'World Cuisine', 'Gardening Tips', 'Pet Care', 'Home Improvement', 'Photography Basics', 'Video Editing', 'Music Production'];

    const generatedResults = [];
    for (let i = 0; i < count; i++) {
        const domain = domains[Math.floor(Math.random() * domains.length)];
        const category = categories[Math.floor(Math.random() * categories.length)];
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        const topic1 = topics[Math.floor(Math.random() * topics.length)];
        let topic2 = topics[Math.floor(Math.random() * topics.length)];
        while (topic2 === topic1) { // Ensure different topics
            topic2 = topics[Math.floor(Math.random() * topics.length)];
        }

        const title = `${adj} ${noun} on ${topic1} and ${topic2}`;
        const description = `This ${noun.toLowerCase()} provides a ${adj.toLowerCase()} look into the latest advancements and key concepts in ${topic1} and its impact on ${topic2}. Discover in-depth insights and practical information for enthusiasts and professionals alike. Explore the future of ${topic1} and its implications for ${topic2}.`;
        const url = `https://${domain}/${topic1.toLowerCase().replace(/\s+/g, '-')}/${noun.toLowerCase().replace(/\s+/g, '-')}-${i}`;

        generatedResults.push({
            domain: domain,
            title: title,
            url: url,
            description: description,
            category: category
        });
    }
    return generatedResults;
}

// --- Worker Initialization and Data Loading ---
async function initializeWorkerData() {
    console.log("Worker: Starting data loading...");
    // Simulate loading time for a large file (e.g., 10MB)
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate 1 second load time

    const generatedGeneralResults = generateSyntheticData(20000); // Generate 20,000 synthetic results
    const userContributions = await getUserContributionsFromDB(); // Fetch user contributions

    // Combine all data sources
    MOCK_DATA = {
        ...CURATED_MOCK_DATA,
        general_results: [...generatedGeneralResults, ...userContributions] // Merge user contributions into general results
    };
    localDataLoaded = true;
    self.postMessage({ type: 'workerReady' });
    console.log(`Worker: Data loaded. Total general results (including user contributions): ${MOCK_DATA.general_results.length}`);
}

// --- Search Logic Functions ---

// Function to dynamically generate URLs for specific queries
// This function is still useful for generating links to common services based on query patterns,
// even without external APIs for search results themselves.
function generateDynamicUrls(query) {
    const lowerCaseQuery = query.toLowerCase();
    const dynamicResults = [];

    // Weather query pattern: "weather [city] [region]"
    const weatherMatch = lowerCaseQuery.match(/(?:weather|погода|forecast)\s+([a-zA-Zа-яієїґ\s]+?)(?:\s+(?:in|у|в)\s+)?([a-zA-Zа-яієїґ\s]+)?/);
    if (weatherMatch) {
        const city = weatherMatch[1].trim().replace(/\s+/g, '-'); // Replace spaces with hyphens for URL
        const region = weatherMatch[2] ? weatherMatch[2].trim().replace(/\s+/g, '-') : '';

        if (city) {
            dynamicResults.push({
                domain: 'meteoprog.ua',
                title: `Weather in ${city.replace(/-/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} - Meteoprog`,
                url: `https://www.meteoprog.ua/en/weather/${city}/`,
                description: `Current weather forecast for ${city.replace(/-/g, ' ')}`,
                category: 'news'
            });
            dynamicResults.push({
                domain: 'gismeteo.ua',
                title: `Weather in ${city.replace(/-/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} - Gismeteo`,
                url: `https://www.gismeteo.ua/en/weather/${city}/`,
                description: `Detailed weather forecast for ${city.replace(/-/g, ' ')}`,
                category: 'news'
            });
            dynamicResults.push({
                domain: 'accuweather.com',
                title: `Weather in ${city.replace(/-/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} - AccuWeather`,
                url: `https://www.accuweather.com/en/search-locations?query=${encodeURIComponent(city)}`,
                description: `Accurate weather forecast for ${city.replace(/-/g, ' ')}`,
                category: 'news'
            });
        }
    }

    // Map query pattern: "map [location]" or "[location] map"
    const mapMatch = lowerCaseQuery.match(/(?:map|карта|location)\s+([a-zA-Zа-яієїґ\s]+)|([a-zA-Zа-яієїґ\s]+)\s+(?:map|карта|location)/);
    if (mapMatch) {
        const location = (mapMatch[1] || mapMatch[2]).trim();
        if (location) {
            dynamicResults.push({
                domain: 'google.com/maps',
                title: `Map of ${location.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} - Google Maps`,
                url: `https://www.google.com/maps/search/${encodeURIComponent(location)}`,
                description: `Find ${location} on Google Maps.`,
                category: 'maps'
            });
            dynamicResults.push({
                domain: 'openstreetmap.org',
                title: `Map of ${location.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} - OpenStreetMap`,
                url: `https://www.openstreetmap.org/search?query=${encodeURIComponent(location)}`,
                description: `Explore ${location} on OpenStreetMap.`,
                category: 'maps'
            });
        }
    }

    // Code query pattern: "code for [topic]" or "[topic] code"
    const codeMatch = lowerCaseQuery.match(/(?:code|example|snippet|programming|javascript|python|html|css)\s+(?:for\s+)?([\w\s]+)|([\w\s]+)\s+(?:code|example|snippet)/i);
    if (codeMatch) {
        const topic = (codeMatch[1] || codeMatch[2]).trim();
        if (topic) {
            dynamicResults.push({
                domain: 'github.com',
                title: `${topic} Code Examples - GitHub`,
                url: `https://github.com/search?q=${encodeURIComponent(topic)}+language:javascript`, // Default to JS
                description: `Search for ${topic} code examples on GitHub`,
                category: 'code'
            });
            dynamicResults.push({
                domain: 'stackoverflow.com',
                title: `${topic} - Stack Overflow`,
                url: `https://stackoverflow.com/search?q=${encodeURIComponent(topic)}`,
                description: `Find solutions and discussions about ${topic} on Stack Overflow`,
                category: 'code'
            });
        }
    }

    // Science/Research query pattern: "research on [topic]" or "paper on [topic]"
    const scienceMatch = lowerCaseQuery.match(/(?:research|paper|study|science)\s+(?:on\s+)?([\w\s]+)|([\w\s]+)\s+(?:research|paper|study)/i);
    if (scienceMatch) {
        const topic = (scienceMatch[1] || scienceMatch[2]).trim();
        if (topic) {
            dynamicResults.push({
                domain: 'scholar.google.com',
                title: `Academic papers on ${topic} - Google Scholar`,
                url: `https://scholar.google.com/scholar?q=${encodeURIComponent(topic)}`,
                description: `Search academic papers about ${topic}`,
                category: 'science'
            });
            dynamicResults.push({
                domain: 'pubmed.ncbi.nlm.nih.gov',
                title: `PubMed articles on ${topic}`,
                url: `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(topic)}`,
                description: `Search medical and life science articles on PubMed`,
                category: 'science'
            });
        }
    }

    return dynamicResults;
}

// Function to calculate relevance score for a result
function calculateRelevanceScore(result, queryWords, categoryId) {
    let score = 0;
    const lowerCaseTitle = result.title.toLowerCase();
    const lowerCaseDescription = result.description.toLowerCase();
    const resultCategory = result.category;

    // Score based on keyword presence and position
    queryWords.forEach(word => {
        if (lowerCaseTitle.includes(word)) {
            score += 10; // Higher score for title match
            if (lowerCaseTitle.startsWith(word)) score += 5; // Even higher for start of title
        }
        if (lowerCaseDescription.includes(word)) {
            score += 5; // Score for description match
        }
        // Check for exact word match
        const wordRegex = new RegExp(`\\b${word}\\b`, 'g');
        if (lowerCaseTitle.match(wordRegex)) score += 3;
        if (lowerCaseDescription.match(wordRegex)) score += 1;
    });

    // Score for category match
    if (categoryId !== 'all' && resultCategory === categoryId) {
        score += 20; // Significant boost for category match
    }

    // Boost for results with multiple query words
    let matchedWordsCount = 0;
    queryWords.forEach(word => {
        if (lowerCaseTitle.includes(word) || lowerCaseDescription.includes(word)) {
            matchedWordsCount++;
        }
    });
    if (matchedWordsCount === queryWords.length && queryWords.length > 1) {
        score += 15; // Boost if all words are found for multi-word queries
    } else if (matchedWordsCount > 0) {
        score += matchedWordsCount * 2; // Smaller boost for partial matches
    }

    return score;
}

// Function to perform enhanced local search within MOCK_DATA
async function enhanceLocalSearch(query, categoryId) {
    let processedQuery = query.toLowerCase();
    const queryWords = processedQuery.split(' ').filter(word => word.length > 0);

    // Apply synonyms to the processed query for broader matching
    Object.keys(SYNONYMS).forEach(short => {
        processedQuery = processedQuery.replace(new RegExp(`\\b${short}\\b`, 'g'), SYNONYMS[short]);
    });
    
    let results = [];

    // 1. Try dynamic URL generation first (these are not from MOCK_DATA but generated based on query patterns)
    const dynamicResults = generateDynamicUrls(processedQuery);
    if (dynamicResults.length > 0) {
        const filteredDynamicResults = dynamicResults.filter(item =>
            categoryId === 'all' || item.category === item.category // Dynamic URLs often have their own category
        );
        if (filteredDynamicResults.length > 0) {
            results.push(...filteredDynamicResults);
        }
    }

    // 2. Check for exact match in specific curated queries from CURATED_MOCK_DATA
    if (CURATED_MOCK_DATA[processedQuery]) {
        const curatedResults = CURATED_MOCK_DATA[processedQuery].filter(item =>
            categoryId === 'all' || item.category === categoryId
        );
        if (curatedResults.length > 0) {
            results.push(...curatedResults);
        }
    }

    // 3. Search within general results from MOCK_DATA (synthetically generated + user contributions)
    if (MOCK_DATA.general_results && MOCK_DATA.general_results.length > 0) {
        const generalFilteredResults = MOCK_DATA.general_results.map(item => {
            const score = calculateRelevanceScore(item, queryWords, categoryId);
            return { ...item, score: score };
        }).filter(item => item.score > 0) // Only include results with a positive score
          .sort((a, b) => b.score - a.score); // Sort by score descending
        
        results.push(...generalFilteredResults);
    }
    
    // Final deduplication and sorting (primary by score, then by original order for ties)
    const uniqueResults = [];
    const seenUrls = new Set();
    // Sort all results by score before deduplicating to keep higher scored duplicates
    results.sort((a, b) => (b.score || 0) - (a.score || 0)); 

    for (const result of results) {
        if (!seenUrls.has(result.url)) {
            uniqueResults.push(result);
            seenUrls.add(result.url);
        }
    }

    return uniqueResults;
}

// Web Worker message handler
self.onmessage = async function(e) {
    if (e.data.type === 'loadData' || e.data.type === 'reloadLocalData') { // Added reloadLocalData type
        if (!localDataLoaded || e.data.type === 'reloadLocalData') { // Reload if explicitly requested or not loaded
            await initializeWorkerData();
        } else {
            self.postMessage({ type: 'workerReady' });
        }
    } else if (e.data.type === 'search') {
        const { query, categoryId } = e.data;
        if (!localDataLoaded) {
            // If search is requested before data is loaded, load it first
            await initializeWorkerData();
        }
        // All search logic is now purely local within enhanceLocalSearch
        const results = await enhanceLocalSearch(query, categoryId);
        self.postMessage({ type: 'searchResults', results });
    }
};

// Initial data load when worker starts
initializeWorkerData();

