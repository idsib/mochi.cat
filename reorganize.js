import fs from 'fs';
import path from 'path';

const PICS_DIR = 'public/pics';
const VALID_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.mov', '.webm'];

function reorganize() {
    const files = fs.readdirSync(PICS_DIR).filter(f => VALID_EXTS.includes(path.extname(f).toLowerCase()));

    // 1. Separate existing mochi files vs new files
    const mochiFiles = [];
    const newFiles = [];

    const mochiRegex = /^mochi(\d+)(\.[a-z0-9]+)$/i;

    files.forEach(f => {
        const match = f.match(mochiRegex);
        if (match) {
            mochiFiles.push({
                name: f,
                num: parseInt(match[1]),
                ext: match[2]
            });
        } else {
            newFiles.push(f);
        }
    });

    // 2. Find highest number
    let maxNum = 0;
    mochiFiles.forEach(m => {
        if (m.num > maxNum) maxNum = m.num;
    });

    console.log(`Found ${mochiFiles.length} existing mochi files. Max index: ${maxNum}`);
    console.log(`Found ${newFiles.length} new files to rename:`, newFiles);

    // 3. Rename new files
    newFiles.sort(); // Sort alphabetically (IMG_2181, IMG_2182...)
    let currentNum = maxNum + 1;

    newFiles.forEach(oldName => {
        const ext = path.extname(oldName).toLowerCase();
        const newName = `mochi${currentNum}${ext}`;
        fs.renameSync(path.join(PICS_DIR, oldName), path.join(PICS_DIR, newName));
        console.log(`Renamed ${oldName} -> ${newName}`);
        currentNum++;
    });

    // 4. Generate pics.json
    const finalFiles = fs.readdirSync(PICS_DIR).filter(f => VALID_EXTS.includes(path.extname(f).toLowerCase()));

    // Custom numeric sort for final list
    finalFiles.sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || 0);
        const numB = parseInt(b.match(/\d+/)?.[0] || 0);
        return numA - numB;
    });

    fs.writeFileSync('public/pics.json', JSON.stringify(finalFiles, null, 2));
    console.log('Updated pics.json');
}

reorganize();
