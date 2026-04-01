const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Keep the existing startup call working while honoring cPanel/Passenger ports.
const originalListen = app.listen.bind(app);
app.listen = (...args) => {
    return originalListen(PORT, HOST, () => {
        console.log(`HJNBL app running on ${HOST}:${PORT}`);
    });
};

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

const DB_FILE = path.join(__dirname, 'database.json');
const PHOTOS_DIR = path.join(__dirname, 'player_photo');

let schedule = [];
let rosters = {};
let matchStats = {}; 

const loadDB = () => {
    if (!fs.existsSync(DB_FILE)) return;
    try {
        const raw = fs.readFileSync(DB_FILE);
        const dbData = JSON.parse(raw);
        schedule = dbData.schedule || [];
        rosters = dbData.rosters || {};
        matchStats = dbData.matchStats || {};
    } catch(err) {}
};
loadDB();

const defaultStats = () => ({ 
    q1_1:0, q1_2:0, q1_3:0, q2_1:0, q2_2:0, q2_3:0, q3_1:0, q3_2:0, q3_3:0, q4_1:0, q4_2:0, q4_3:0, ot_1:0, ot_2:0, ot_3:0, 
    reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, foul: 0 
});

const getPts = (s) => {
    let q1 = (s.q1_1||0)*1 + (s.q1_2||0)*2 + (s.q1_3||0)*3;
    let q2 = (s.q2_1||0)*1 + (s.q2_2||0)*2 + (s.q2_3||0)*3;
    let q3 = (s.q3_1||0)*1 + (s.q3_2||0)*2 + (s.q3_3||0)*3;
    let q4 = (s.q4_1||0)*1 + (s.q4_2||0)*2 + (s.q4_3||0)*3;
    let ot = (s.ot_1||0)*1 + (s.ot_2||0)*2 + (s.ot_3||0)*3;
    return { q1, q2, q3, q4, ot, total: q1+q2+q3+q4+ot };
};

const saveDB = () => { fs.writeFileSync(DB_FILE, JSON.stringify({ schedule, rosters, matchStats }, null, 2)); };

const teamFolderMap = {
    "KIRTIPUR": ["Kirtipur", "iimsktr"],
    "KVC HOUNDS": ["KVC Hounds", "kvchou"],
    "PLAYBOX": ["playbox", "Playbox"],
    "SOLO": ["solo", "Solo"],
    "ROYAL": ["royal", "Royal"],
    "ARMY": ["army", "Army"],
    "TIMES": ["times", "Times"],
    "GGIC": ["GoldenGate", "ggic"]
};
const teamLogoFiles = {
    "KIRTIPUR": ["Kirtipur"],
    "KVC HOUNDS": ["Hounds"],
    "PLAYBOX": ["Playbox"],
    "SOLO": ["Solo"],
    "ROYAL": ["Royal"],
    "ARMY": ["Army"],
    "TIMES": ["Times"],
    "GGIC": ["GoldenGate"]
};
const validExtensions = ['.jpeg', '.jpg', '.png', '.JPEG', '.JPG', '.PNG'];

const normalizeKey = (value = '') => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');

const findExistingDirectory = (rootDir, candidates = []) => {
    if (!fs.existsSync(rootDir)) return null;
    const directories = fs.readdirSync(rootDir, { withFileTypes: true }).filter((entry) => entry.isDirectory());
    const byNormalizedName = new Map(directories.map((entry) => [normalizeKey(entry.name), entry.name]));

    for (const candidate of candidates) {
        const match = byNormalizedName.get(normalizeKey(candidate));
        if (match) return match;
    }

    return null;
};

const findExistingFile = (rootDir, candidates = []) => {
    if (!fs.existsSync(rootDir)) return null;
    const files = fs.readdirSync(rootDir, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => entry.name);
    const byNormalizedBaseName = new Map(files.map((fileName) => [normalizeKey(path.parse(fileName).name), fileName]));

    for (const candidate of candidates) {
        const match = byNormalizedBaseName.get(normalizeKey(candidate));
        if (match) return match;
    }

    return null;
};

const findPlayerPhotoFile = (teamPath, player) => {
    if (!fs.existsSync(teamPath)) return null;
    const files = fs.readdirSync(teamPath, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => entry.name);
    const exactFiles = new Set(files);

    for (const ext of validExtensions) {
        const byJersey = `${player.jersey}${ext}`;
        const byName = `${player.name}${ext}`;
        if (exactFiles.has(byJersey)) return byJersey;
        if (exactFiles.has(byName)) return byName;
    }

    const normalizedJersey = normalizeKey(player.jersey);
    const normalizedName = normalizeKey(player.name);
    const rawJersey = String(player.jersey).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const jerseyWithSuffixPattern = new RegExp(`^${rawJersey}(?:[-_\\s(]|$)`, 'i');

    return files.find((fileName) => normalizeKey(path.parse(fileName).name) === normalizedJersey)
        || files.find((fileName) => normalizeKey(path.parse(fileName).name) === normalizedName)
        || files.find((fileName) => jerseyWithSuffixPattern.test(path.parse(fileName).name))
        || null;
};

const resolveCaseInsensitivePath = (rootDir, relativePath = '') => {
    const parts = String(relativePath).split('/').filter(Boolean);
    let currentPath = rootDir;

    for (const part of parts) {
        if (!fs.existsSync(currentPath)) return null;
        const entries = fs.readdirSync(currentPath, { withFileTypes: true });
        const match = entries.find((entry) => normalizeKey(entry.name) === normalizeKey(part));
        if (!match) return null;
        currentPath = path.join(currentPath, match.name);
    }

    return currentPath;
};

app.use('/photos', (req, res, next) => {
    const requestPath = decodeURIComponent(req.path || '/');
    const cleanPath = requestPath.replace(/^\/+/, '').split('?')[0];
    const resolvedPath = resolveCaseInsensitivePath(PHOTOS_DIR, cleanPath);

    if (resolvedPath && fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
        return res.sendFile(resolvedPath);
    }

    next();
});

app.use('/photos', express.static(path.join(__dirname, 'player_photo')));

const getDynamicLogos = () => {
    let logos = {};
    const logoDir = path.join(PHOTOS_DIR, 'teamlogoall');
    if(fs.existsSync(logoDir)) {
        Object.keys(teamLogoFiles).forEach(team => {
            const logoFile = findExistingFile(logoDir, teamLogoFiles[team]);
            if (logoFile) {
                const stat = fs.statSync(path.join(logoDir, logoFile));
                logos[team] = `/photos/teamlogoall/${logoFile}?v=${stat.mtimeMs}`;
            }
        });
    }
    return logos;
};

const refreshPlayerPhoto = (team, player) => {
    const folderCandidates = teamFolderMap[team] || [team];
    const folderName = findExistingDirectory(PHOTOS_DIR, folderCandidates);
    if (!folderName) return;

    const teamPath = path.join(PHOTOS_DIR, folderName);
    let foundFile = false;
    const photoFile = findPlayerPhotoFile(teamPath, player);
    if (photoFile) {
        const stat = fs.statSync(path.join(teamPath, photoFile));
        player.photo = `/photos/${folderName}/${photoFile}?v=${stat.mtimeMs}`;
        foundFile = true;
    }

    if (!foundFile && (!player.photo || player.photo.startsWith('/photos/'))) { player.photo = ""; }
};

const injectDynamicPhotos = (rostersObj) => {
    let rostersCopy = JSON.parse(JSON.stringify(rostersObj));
    Object.keys(rostersCopy).forEach(team => { rostersCopy[team].forEach(p => { if (!p.photo || !p.photo.startsWith('http')) refreshPlayerPhoto(team, p); }); });
    return rostersCopy;
};

const linkPlayerPhotos = () => {
    Object.keys(rosters).forEach(team => { rosters[team].forEach(p => { if (!p.photo || !p.photo.startsWith('http')) refreshPlayerPhoto(team, p); }); });
    saveDB();
};
linkPlayerPhotos();

app.get('/api/schedule', (req, res) => {
    loadDB();
    res.json({ schedule, rosters: injectDynamicPhotos(rosters), matchStats, teamLogos: getDynamicLogos() });
});

app.post('/api/match', (req, res) => {
    const { date, teamA, teamB } = req.body; const newId = schedule.length > 0 ? Math.max(...schedule.map(m => m.id)) + 1 : 1;
    schedule.push({ id: newId, date, teamA, teamB });
    matchStats[newId] = { isCompleted: false, [teamA]: {}, [teamB]: {} };
    (rosters[teamA] || []).forEach(p => { matchStats[newId][teamA][p.jersey] = defaultStats(); });
    (rosters[teamB] || []).forEach(p => { matchStats[newId][teamB][p.jersey] = defaultStats(); });
    saveDB(); res.json({ success: true, schedule, matchStats });
});

app.post('/api/edit-match', (req, res) => {
    const { id, date, teamA, teamB } = req.body; let match = schedule.find(m => m.id === parseInt(id));
    if (match) {
        if (match.teamA !== teamA || match.teamB !== teamB) {
            if(!matchStats[id]) matchStats[id] = { isCompleted: false };
            if(!matchStats[id][teamA]) matchStats[id][teamA] = {}; if(!matchStats[id][teamB]) matchStats[id][teamB] = {};
            (rosters[teamA] || []).forEach(p => { if (!matchStats[id][teamA][p.jersey]) matchStats[id][teamA][p.jersey] = defaultStats(); });
            (rosters[teamB] || []).forEach(p => { if (!matchStats[id][teamB][p.jersey]) matchStats[id][teamB][p.jersey] = defaultStats(); });
        }
        match.date = date; match.teamA = teamA; match.teamB = teamB;
        saveDB(); res.json({ success: true, schedule, matchStats });
    } else { res.json({ success: false, error: "Match not found" }); }
});

app.post('/api/delete-match', (req, res) => {
    const { id } = req.body; schedule = schedule.filter(m => m.id !== parseInt(id));
    if (matchStats[id]) delete matchStats[id]; saveDB(); res.json({ success: true, schedule });
});

app.post('/api/player', (req, res) => {
    const { team, jersey, name, matchId, position, height, age, photo } = req.body;
    if (!rosters[team]) rosters[team] = [];
    if (!rosters[team].find(p => p.jersey === parseInt(jersey))) {
        let newPlayer = { jersey: parseInt(jersey), name, position, height, age, photo };
        if (!photo || photo.startsWith('/photos/')) refreshPlayerPhoto(team, newPlayer);
        rosters[team].push(newPlayer); rosters[team].sort((a, b) => a.jersey - b.jersey);
    }
    if (matchId && matchStats[matchId] && matchStats[matchId][team]) { if (!matchStats[matchId][team][jersey]) matchStats[matchId][team][jersey] = defaultStats(); }
    saveDB(); res.json({ success: true, rosters: injectDynamicPhotos(rosters) });
});

app.post('/api/edit-player', (req, res) => {
    const { team, originalJersey, newJersey, newName, age, height, position, photo } = req.body;
    if (rosters[team]) {
        const oldJ = parseInt(originalJersey); const newJ = parseInt(newJersey); let player = rosters[team].find(p => p.jersey === oldJ);
        if (player) {
            if (oldJ !== newJ) {
                Object.keys(matchStats).forEach(matchId => {
                    if (matchStats[matchId][team] && matchStats[matchId][team][oldJ]) { matchStats[matchId][team][newJ] = matchStats[matchId][team][oldJ]; delete matchStats[matchId][team][oldJ]; }
                });
            }
            player.jersey = newJ; player.name = newName; player.age = age; player.height = height; player.position = position; 
            if(photo && photo.startsWith('http')) { player.photo = photo; } else { player.photo = ""; }
            if (!player.photo || player.photo.startsWith('/photos/')) refreshPlayerPhoto(team, player);
            rosters[team].sort((a, b) => a.jersey - b.jersey); saveDB(); res.json({ success: true, rosters: injectDynamicPhotos(rosters) });
        }
    }
});

app.get('/api/match/:id', (req, res) => {
    loadDB();
    const id = parseInt(req.params.id); const match = schedule.find(m => m.id === id);
    if (!match) return res.json({ error: "Not found" });
    if (!matchStats[id]) matchStats[id] = { isCompleted: false, [match.teamA]: {}, [match.teamB]: {} };
    if (!matchStats[id][match.teamA]) matchStats[id][match.teamA] = {};
    if (!matchStats[id][match.teamB]) matchStats[id][match.teamB] = {};

    let teamTotals = {
        [match.teamA]: { q1:0, q2:0, q3:0, q4:0, total:0, reb:0, ast:0, stl:0, blk:0 },
        [match.teamB]: { q1:0, q2:0, q3:0, q4:0, total:0, reb:0, ast:0, stl:0, blk:0 }
    };
    let calculatedStats = { [match.teamA]: {}, [match.teamB]: {} };

    [match.teamA, match.teamB].forEach(team => {
        (rosters[team] || []).forEach(p => { 
            if (!matchStats[id][team][p.jersey]) matchStats[id][team][p.jersey] = defaultStats(); 
            let s = matchStats[id][team][p.jersey]; let pts = getPts(s);
            calculatedStats[team][p.jersey] = {
                pts: pts.total, q1: pts.q1, q2: pts.q2, q3: pts.q3, q4: pts.q4,
                threes: (s.q1_3||0) + (s.q2_3||0) + (s.q3_3||0) + (s.q4_3||0) + (s.ot_3||0),
                twos: (s.q1_2||0) + (s.q2_2||0) + (s.q3_2||0) + (s.q4_2||0) + (s.ot_2||0),
                reb: s.reb||0, ast: s.ast||0, stl: s.stl||0, blk: s.blk||0
            };
            teamTotals[team].q1 += pts.q1; teamTotals[team].q2 += pts.q2; teamTotals[team].q3 += pts.q3; teamTotals[team].q4 += pts.q4; teamTotals[team].total += pts.total;
            teamTotals[team].reb += s.reb||0; teamTotals[team].ast += s.ast||0; teamTotals[team].stl += s.stl||0; teamTotals[team].blk += s.blk||0;
        });
    });

    saveDB(); 
    const matchRosters = injectDynamicPhotos({ [match.teamA]: rosters[match.teamA], [match.teamB]: rosters[match.teamB] });
    res.json({ match, rosters: matchRosters, stats: matchStats[id], calculatedStats, teamTotals, logos: getDynamicLogos() });
});

app.post('/api/match-status', (req, res) => {
    const { matchId, isCompleted } = req.body;
    if (!matchStats[matchId]) matchStats[matchId] = {}; matchStats[matchId].isCompleted = isCompleted;
    saveDB(); res.json({ success: true, isCompleted });
});

app.post('/api/stat', (req, res) => {
    const { matchId, team, jersey, stat, amount } = req.body;
    if (!matchStats[matchId]) matchStats[matchId] = {}; if (!matchStats[matchId][team]) matchStats[matchId][team] = {};
    if (!matchStats[matchId][team][jersey]) matchStats[matchId][team][jersey] = defaultStats();
    if (matchStats[matchId][team][jersey][stat] === undefined) matchStats[matchId][team][jersey][stat] = 0;
    if (matchStats[matchId][team][jersey][stat] + amount >= 0) matchStats[matchId][team][jersey][stat] += amount;
    saveDB(); res.json({ success: true });
});

// -------------------------------------------------------------
// 🌟 RE-ADDED: RECENT MATCHES LOGIC (FIXES THE ERROR!)
// -------------------------------------------------------------
app.get('/api/recent-matches', (req, res) => {
    loadDB();
    const team = req.query.team;
    if (!team) return res.json({ recent: [], logos: getDynamicLogos() });

    let results = [];
    const completedMatches = schedule.filter(m => matchStats[m.id] && matchStats[m.id].isCompleted);

    completedMatches.forEach(m => {
        if (m.teamA === team || m.teamB === team) {
            let scoreA = 0; let scoreB = 0;
            if (matchStats[m.id][m.teamA]) { Object.values(matchStats[m.id][m.teamA]).forEach(s => scoreA += getPts(s).total); }
            if (matchStats[m.id][m.teamB]) { Object.values(matchStats[m.id][m.teamB]).forEach(s => scoreB += getPts(s).total); }

            results.push({ id: m.id, teamA: m.teamA, teamB: m.teamB, scoreA, scoreB, margin: Math.abs(scoreA - scoreB) });
        }
    });

    results.sort((a, b) => b.id - a.id); // Latest first
    res.json({ recent: results.slice(0, 7), logos: getDynamicLogos() });
});

app.get('/api/tournament-stats', (req, res) => {
    loadDB();
    let allPlayers = []; let totalTournament3s = 0; let teamTotals = {};
    const freshRosters = injectDynamicPhotos(rosters); const logos = getDynamicLogos();
    
    // Track Single Game Records
    let singleGamePerformances = { pts: [], threes: [], reb: [], ast: [], stl: [], blk: [] };

    Object.keys(freshRosters).forEach(team => {
        teamTotals[team] = { gp:0, pts:0, reb:0, ast:0, stl:0, blk:0, tov:0, q1:0, q2:0, q3:0, q4:0, logo: logos[team] || '' };
        freshRosters[team].forEach(p => {
            let stats = { team, jersey: p.jersey, name: p.name, photo: p.photo, position: p.position, height: p.height, age: p.age, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, threes: 0, twos: 0, gp: 0, q1:0, q2:0, q3:0, q4:0, vsTeams: {} };
            
            schedule.forEach(match => {
                if ((match.teamA === team || match.teamB === team) && matchStats[match.id] && matchStats[match.id][team] && matchStats[match.id][team][p.jersey]) {
                    let s = matchStats[match.id][team][p.jersey]; 
                    let ptsData = getPts(s);
                    let match3s = (s.q1_3||0) + (s.q2_3||0) + (s.q3_3||0) + (s.q4_3||0) + (s.ot_3||0);
                    let match2s = (s.q1_2||0) + (s.q2_2||0) + (s.q3_2||0) + (s.q4_2||0) + (s.ot_2||0);
                    
                    if(ptsData.total > 0 || s.reb > 0 || s.ast > 0 || s.foul > 0 || s.stl > 0 || s.blk > 0) {
                        stats.gp++; stats.pts += ptsData.total; stats.reb += (s.reb||0); stats.ast += (s.ast||0); stats.stl += (s.stl||0); stats.blk += (s.blk||0); stats.tov += (s.tov||0);
                        stats.threes += match3s; stats.twos += match2s; totalTournament3s += match3s; stats.q1 += ptsData.q1; stats.q2 += ptsData.q2; stats.q3 += ptsData.q3; stats.q4 += ptsData.q4;
                        let oppTeam = match.teamA === team ? match.teamB : match.teamA;
                        if(!stats.vsTeams[oppTeam]) stats.vsTeams[oppTeam] = 0; stats.vsTeams[oppTeam] += ptsData.total;

                        teamTotals[team].pts += ptsData.total; teamTotals[team].reb += (s.reb||0); teamTotals[team].ast += (s.ast||0); teamTotals[team].stl += (s.stl||0); teamTotals[team].blk += (s.blk||0);
                        teamTotals[team].q1 += ptsData.q1; teamTotals[team].q2 += ptsData.q2; teamTotals[team].q3 += ptsData.q3; teamTotals[team].q4 += ptsData.q4;

                        // Track Individual Match Performances (IPL Style)
                        const entry = { name: p.name, team: team, photo: p.photo, jersey: p.jersey };
                        if (ptsData.total > 0) singleGamePerformances.pts.push({ ...entry, pts: ptsData.total });
                        if (match3s > 0) singleGamePerformances.threes.push({ ...entry, threes: match3s });
                        if (s.reb > 0) singleGamePerformances.reb.push({ ...entry, reb: s.reb });
                        if (s.ast > 0) singleGamePerformances.ast.push({ ...entry, ast: s.ast });
                        if (s.stl > 0) singleGamePerformances.stl.push({ ...entry, stl: s.stl });
                        if (s.blk > 0) singleGamePerformances.blk.push({ ...entry, blk: s.blk });
                    }
                }
            });
            if(stats.gp > 0) allPlayers.push(stats);
        });
    });

    schedule.forEach(match => {
        let stats = matchStats[match.id];
        if(stats && stats.isCompleted) {
            if(teamTotals[match.teamA]) teamTotals[match.teamA].gp++; if(teamTotals[match.teamB]) teamTotals[match.teamB].gp++;
        }
    });

    const getSingleTop = (metric) => [...singleGamePerformances[metric]].sort((a, b) => b[metric] - a[metric]).slice(0, 5);
    const getTop = (metric, limit = 5) => [...allPlayers].sort((a, b) => b[metric] - a[metric]).slice(0, limit);
    
    res.json({ 
        totalTournament3s, 
        teamTotals, 
        leaders: { pts: getTop('pts'), reb: getTop('reb'), ast: getTop('ast'), threes: getTop('threes'), twos: getTop('twos'), stl: getTop('stl'), blk: getTop('blk'), tov: getTop('tov') }, 
        singleGameLeaders: { pts: getSingleTop('pts'), threes: getSingleTop('threes'), reb: getSingleTop('reb'), ast: getSingleTop('ast'), stl: getSingleTop('stl'), blk: getSingleTop('blk') },
        allPlayers, 
        logos 
    });
});

app.get('/api/standings', (req, res) => {
    loadDB();
    let standings = {};
    Object.keys(rosters).forEach(t => standings[t] = { team: t, played: 0, wins: 0, losses: 0, pf: 0, pa: 0, pd: 0, pts: 0 });
    schedule.forEach(match => {
        let stats = matchStats[match.id];
        if(stats && stats.isCompleted) {
            let scoreA = 0; let scoreB = 0;
            if(stats[match.teamA]) Object.values(stats[match.teamA]).forEach(s => scoreA += getPts(s).total);
            if(stats[match.teamB]) Object.values(stats[match.teamB]).forEach(s => scoreB += getPts(s).total);
            if(scoreA > 0 || scoreB > 0) {
                standings[match.teamA].played++; standings[match.teamB].played++;
                standings[match.teamA].pf += scoreA; standings[match.teamB].pf += scoreB;
                standings[match.teamA].pa += scoreB; standings[match.teamB].pa += scoreA;
                if(scoreA > scoreB) { standings[match.teamA].wins++; standings[match.teamB].losses++; } 
                else if (scoreB > scoreA) { standings[match.teamB].wins++; standings[match.teamA].losses++; }
            }
        }
    });
    Object.values(standings).forEach(s => { s.pd = s.pf - s.pa; s.pts = (s.wins * 2) + (s.losses * 1); });
    res.json(Object.values(standings).sort((a,b) => b.pts - a.pts || b.pd - a.pd));
});

let cgState = { action: 'hide', type: '', payload: null, timestamp: 0 };
app.get('/api/cg-state', (req, res) => res.json(cgState));
app.post('/api/cg-state', (req, res) => {
    cgState = { action: req.body.action, type: req.body.type, payload: req.body.payload, timestamp: Date.now() };
    res.json({ success: true, cgState });
});

app.listen(3000, () => console.log(`🏀 Advanced Match Tracker running at http://localhost:3000`));
