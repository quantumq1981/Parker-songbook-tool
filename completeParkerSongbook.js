
```javascript
// src/data/completeParkerSongbook.js
export const completeParkerSongbook = {
  "book": {
    "title": "Charlie Parker Complete Tune Book",
    "artist": "Charlie Parker",
    "transcriber": "Fred Parcells",
    "date": "1979-08-02",
    "description": "Transcriptions of Charlie Parker's compositions and improvisations",
    "totalTunes": 74,
    "categories": ["Blues", "Rhythm Changes", "Contrafacts", "Ballads", "Original Forms"]
  },
  
  "tunes": [
    // ALL YOUR 74 TUNES HERE - copy and paste exactly as provided
    {
      "id": 1,
      "title": "AH LEU CHA",
      "key": "F",
      "form": "AABA",
      "bars": 32,
      "structure": "Rhythm Changes",
      "progression": [
        ["FΔ7", "Gm7", "Cm7", "F7"],
        ["BbΔ7", "Bbm7", "FΔ7", "A7"],
        ["Dm7", "G7", "Cm7", "F7"],
        ["BbΔ7", "Gm7", "Cm7", "F7"],
        ["D7", "D7", "G7", "G7"],
        ["C7", "C7", "F7", "F7"],
        ["FΔ7", "Gm7", "Cm7", "F7"],
        ["BbΔ7", "Gm7", "Cm7", "F7"]
      ],
      "substitutions": ["D7 = Ab7 (tritone)", "G7 = Db7 (tritone)", "C7 = Gb7 (tritone)"],
      "style": "Bebop"
    },
    // Continue with all 74 tunes exactly as you provided them...
    // Make sure to include ALL 74 tune objects from your JSON
  ]
};
```

2. Now create the parkerData.js file:

```javascript
// src/data/parkerData.js - WORKING SOLUTION
import { completeParkerSongbook } from './completeParkerSongbook.js';

// ==================== INITIAL VERIFICATION ====================
console.log('🎷 Charlie Parker Songbook Loaded');
console.log(`📚 ${completeParkerSongbook.book.title}`);
console.log(`📊 Total Tunes: ${completeParkerSongbook.tunes.length}`);
console.log(`🎵 Artist: ${completeParkerSongbook.book.artist}`);

// ==================== UTILITY FUNCTIONS ====================
function normalizeTitle(title) {
  if (!title) return '';
  return title.toString().trim().toUpperCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
}

export function normalizeChordSymbol(chord) {
  if (!chord || typeof chord !== "string") return chord;
  
  const s = chord.trim();
  
  // Handle special cases
  if (s === 'Bdim7') return 'Bdim7';
  if (s === 'Edim7') return 'Edim7';
  if (s === 'B°7') return 'Bdim7';
  if (s === 'E°7') return 'Edim7';
  
  // Parse chord
  const m = s.match(/^([A-G])([b#]?)(.*)$/);
  if (!m) return s;
  
  const root = m[1] + (m[2] || "");
  const quality = m[3];
  
  if (!quality) return root;
  
  // Quality mapping
  if (quality === 'Δ7') return root + 'maj7';
  if (quality === 'Δ') return root + 'maj7';
  if (quality === '^7') return root + 'maj7';
  if (quality === '^') return root + 'maj7';
  if (quality === 'ø7') return root + 'm7b5';
  if (quality === 'ø') return root + 'm7b5';
  if (quality === '°7') return root + 'dim7';
  if (quality === '°') return root + 'dim';
  
  // Already standard
  return s;
}

// ==================== BUILD INDEXES ====================
function buildIndexes() {
  const tunes = completeParkerSongbook.tunes;
  const indexes = {
    byId: new Map(),
    byTitle: new Map(),
    byForm: new Map(),
    byKey: new Map(),
    byStyle: new Map(),
    byStructure: new Map()
  };

  tunes.forEach(tune => {
    // Index by ID
    indexes.byId.set(tune.id, tune);
    
    // Index by normalized title
    const normTitle = normalizeTitle(tune.title);
    if (!indexes.byTitle.has(normTitle)) {
      indexes.byTitle.set(normTitle, []);
    }
    indexes.byTitle.get(normTitle).push(tune);
    
    // Index by form
    if (!indexes.byForm.has(tune.form)) {
      indexes.byForm.set(tune.form, []);
    }
    indexes.byForm.get(tune.form).push(tune);
    
    // Index by key
    if (!indexes.byKey.has(tune.key)) {
      indexes.byKey.set(tune.key, []);
    }
    indexes.byKey.get(tune.key).push(tune);
    
    // Index by style
    if (tune.style) {
      if (!indexes.byStyle.has(tune.style)) {
        indexes.byStyle.set(tune.style, []);
      }
      indexes.byStyle.get(tune.style).push(tune);
    }
    
    // Index by structure
    if (tune.structure) {
      if (!indexes.byStructure.has(tune.structure)) {
        indexes.byStructure.set(tune.structure, []);
      }
      indexes.byStructure.get(tune.structure).push(tune);
    }
  });

  return indexes;
}

// ==================== CREATE API ====================
const indexes = buildIndexes();

export const parkerAPI = {
  // Metadata
  getBookInfo: () => completeParkerSongbook.book,
  
  // Get single tune
  getTuneById: (id) => {
    const numericId = Number(id);
    return indexes.byId.get(numericId) || null;
  },
  
  // Get tunes by title (returns array)
  getTunesByTitle: (title) => {
    const normTitle = normalizeTitle(title);
    return indexes.byTitle.get(normTitle) || [];
  },
  
  // Get first match by title
  findFirstByTitle: (title) => {
    const tunes = parkerAPI.getTunesByTitle(title);
    return tunes[0] || null;
  },
  
  // Category searches
  getTunesByForm: (form) => indexes.byForm.get(form) || [],
  getTunesByKey: (key) => indexes.byKey.get(key) || [],
  getTunesByStyle: (style) => indexes.byStyle.get(style) || [],
  getTunesByStructure: (structure) => indexes.byStructure.get(structure) || [],
  
  // Get all tunes sorted
  getAllTunesSorted: () => {
    return [...completeParkerSongbook.tunes].sort((a, b) => 
      normalizeTitle(a.title).localeCompare(normalizeTitle(b.title))
    );
  },
  
  // Get unique values for dropdowns
  getAllKeys: () => {
    const keys = new Set(completeParkerSongbook.tunes.map(t => t.key).filter(Boolean));
    return Array.from(keys).sort();
  },
  
  getAllForms: () => {
    const forms = new Set(completeParkerSongbook.tunes.map(t => t.form).filter(Boolean));
    return Array.from(forms).sort();
  },
  
  getAllStyles: () => {
    const styles = new Set(completeParkerSongbook.tunes.map(t => t.style).filter(Boolean));
    return Array.from(styles).sort();
  },
  
  // Random tune
  getRandomTune: () => {
    const tunes = completeParkerSongbook.tunes;
    return tunes[Math.floor(Math.random() * tunes.length)];
  },
  
  // Chord progression display
  getProgressionGrid: (tuneId, options = {}) => {
    const tune = parkerAPI.getTuneById(tuneId);
    if (!tune) return null;
    
    const { normalize = false, barsPerLine = 4 } = options;
    const lines = [];
    let currentLine = [];
    let barNumber = 1;
    
    tune.progression.forEach(row => {
      row.forEach(chord => {
        const displayChord = normalize ? normalizeChordSymbol(chord) : chord;
        
        currentLine.push({
          chord: displayChord,
          original: chord,
          barNumber: barNumber++
        });
        
        if (currentLine.length >= barsPerLine) {
          lines.push([...currentLine]);
          currentLine = [];
        }
      });
    });
    
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }
    
    return lines;
  }
};

// ==================== UI HELPER FUNCTIONS ====================
export function populateTuneDropdown(selectElement) {
  if (!selectElement || !selectElement.appendChild) {
    console.error('Invalid select element');
    return;
  }
  
  // Clear existing
  selectElement.innerHTML = '<option value="">Select a tune...</option>';
  
  // Add all tunes sorted
  const tunes = parkerAPI.getAllTunesSorted();
  
  tunes.forEach(tune => {
    const option = document.createElement('option');
    option.value = tune.id;
    option.textContent = `${tune.title} (${tune.key} ${tune.form})`;
    selectElement.appendChild(option);
  });
  
  console.log(`✅ Dropdown populated with ${tunes.length} tunes`);
}

export function safeSelectTune(tuneId) {
  return parkerAPI.getTuneById(tuneId);
}

// ==================== QUICK VERIFICATION ====================
console.log('✅ API ready. First 5 tunes:');
console.log(parkerAPI.getAllTunesSorted().slice(0, 5).map(t => ({id: t.id, title: t.title, key: t.key})));
```

3. Create a simple HTML test file:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Charlie Parker Songbook</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .chord-grid { display: flex; flex-wrap: wrap; gap: 10px; margin: 20px 0; }
        .chord { padding: 8px 12px; background: #f0f0f0; border-radius: 4px; }
        .tune-info { background: #f8f8f8; padding: 20px; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <h1>🎷 Charlie Parker Songbook</h1>
    
    <label for="tuneSelect">Select a tune:</label>
    <select id="tuneSelect" style="padding: 8px; font-size: 16px; margin: 10px;"></select>
    
    <div id="tuneDisplay" class="tune-info"></div>
    
    <script type="module">
        import { parkerAPI, populateTuneDropdown, safeSelectTune } from './src/data/parkerData.js';
        
        // Initialize dropdown when page loads
        document.addEventListener('DOMContentLoaded', () => {
            const select = document.getElementById('tuneSelect');
            populateTuneDropdown(select);
            
            // Handle tune selection
            select.addEventListener('change', (e) => {
                const tuneId = e.target.value;
                if (!tuneId) {
                    document.getElementById('tuneDisplay').innerHTML = '';
                    return;
                }
                
                const tune = safeSelectTune(tuneId);
                if (tune) {
                    displayTune(tune);
                }
            });
            
            // Auto-select first tune for demo
            if (select.options.length > 1) {
                select.selectedIndex = 1;
                select.dispatchEvent(new Event('change'));
            }
        });
        
        function displayTune(tune) {
            const display = document.getElementById('tuneDisplay');
            const progressionGrid = parkerAPI.getProgressionGrid(tune.id);
            
            display.innerHTML = `
                <h2>${tune.title}</h2>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                    <div>
                        <p><strong>Key:</strong> ${tune.key}</p>
                        <p><strong>Form:</strong> ${tune.form}</p>
                        <p><strong>Bars:</strong> ${tune.bars}</p>
                        <p><strong>Structure:</strong> ${tune.structure}</p>
                        <p><strong>Style:</strong> ${tune.style}</p>
                    </div>
                    <div>
                        <strong>Substitutions:</strong>
                        <ul>
                            ${tune.substitutions ? tune.substitutions.map(sub => `<li>${sub}</li>`).join('') : '<li>None</li>'}
                        </ul>
                    </div>
                </div>
                
                <h3>Chord Progression:</h3>
                <div class="chord-grid">
                    ${progressionGrid.flat().map(chord => `
                        <div class="chord" title="Bar ${chord.barNumber}">
                            ${chord.chord}
                        </div>
                    `).join('')}
                </div>
                
                <h3>Original Chord Notation:</h3>
                <div class="chord-grid">
                    ${progressionGrid.flat().map(chord => `
                        <div class="chord" style="background: #e0f0ff;">
                            ${chord.original}
                        </div>
                    `).join('')}
                </div>
            `;
        }
    </script>
</body>
</html>
```

4. Folder Structure:

```
your-project/
├── src/
│   └── data/
│       ├── completeParkerSongbook.js    # Your dataset
│       └── parkerData.js               # API code
├── index.html                           # Test HTML file
└── package.json (optional)
```

5. To Run It:

1. Save the dataset in src/data/completeParkerSongbook.js
2. Save the API code in src/data/parkerData.js
3. Save the HTML as index.html
4. Open index.html in a browser (use a local server if needed)

6. Verification Script (Optional - add to parkerData.js):

```javascript
// Add at the end of parkerData.js
console.log('🔍 Verification:');
console.log(`- Total tunes: ${parkerAPI.getAllTunesSorted().length}`);
console.log(`- Unique keys: ${parkerAPI.getAllKeys().length}`);
console.log(`- Unique forms: ${parkerAPI.getAllForms().length}`);
console.log(`- Test find tune by ID 1: ${parkerAPI.getTuneById(1)?.title}`);
console.log(`- Test find tune by title: ${parkerAPI.findFirstByTitle('AH LEU CHA')?.id}`);

// Test chord normalization
console.log('🔍 Chord normalization test:');
const testChords = ['FΔ7', 'BbΔ7', 'Eø7', 'B°7', 'Gm7'];
testChords.forEach(chord => {
    console.log(`${chord} → ${normalizeChordSymbol(chord)}`);
});
```

