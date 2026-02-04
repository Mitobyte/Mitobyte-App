const fs = require('fs');

const filePath = 'c:\\Users\\aaron\\Documents\\MitobyteAppVoting\\src\\App.jsx';
const content = fs.readFileSync(filePath, 'utf8');

// Find the start of the garbage
const garbageStart = content.indexOf('{/* Header - Responsive */ }');
if (garbageStart === -1) {
    console.log('Could not find garbage start');
    process.exit(1);
}

// Find the end of the garbage (the last closing brace before export default)
// The garbage ends with a return statement closing `)`.
// Then there is a `}` to close the component.
// Then `export default App`.

const lastExport = content.lastIndexOf('export default App');
if (lastExport === -1) {
    console.log('Could not find export default');
    process.exit(1);
}

// We want to keep everything before garbageStart, and then close the function `}`.
// The garbageStart is seemingly right after the good `return (...)` block.
// So we just need to append `}` and the export.

const newContent = content.substring(0, garbageStart) + '}\n\n' + content.substring(lastExport);

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Fixed App.jsx');
