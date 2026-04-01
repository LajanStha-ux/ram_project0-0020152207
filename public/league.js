const state = {
    scheduleData: null,
    tournamentData: null,
    standings: [],
    fixtureFilter: 'all',
    playerVisibleCount: 10
};

const teamNames = {
    'KIRTIPUR': 'IIMS Kirtipur',
    'TIMES': 'Times Club',
    'SOLO': 'Solo Basketball Academy',
    'ARMY': 'Tribhuwan Army Club',
    'ROYAL': 'Royal',
    'KVC HOUNDS': 'KVC Hounds',
    'GGIC': 'Golden Gate International',
    'PLAYBOX': 'Playbox Arena'
};

const statOptions = {
    pts: 'Points',
    reb: 'Rebounds',
    ast: 'Assists',
    threes: '3-Pointers',
    stl: 'Steals',
    blk: 'Blocks',
    gp: 'Games Played'
};

function fullTeamName(team) {
    return teamNames[team] || team;
}

function logoMarkup(team, size = 48) {
    const url = state.scheduleData?.teamLogos?.[team];
    if (url) {
        return `<img src="${url}" alt="${team} logo" style="width:${size}px;height:${size}px;object-fit:contain;">`;
    }
    return `<div style="width:${size}px;height:${size}px;border-radius:14px;display:grid;place-items:center;background:rgba(255,255,255,.05);color:var(--muted);font-size:11px;font-weight:800;">${team.slice(0, 3)}</div>`;
}

function photoUrl(url) {
    return url && url !== 'undefined' ? url : '/assets/tour_logo.png';
}

function getTeamTotals(teamStats) {
    const totals = { q1: 0, q2: 0, q3: 0, q4: 0, ot: 0, total: 0 };
    if (!teamStats) return totals;

    Object.values(teamStats).forEach((entry) => {
        if (!entry || typeof entry !== 'object') return;
        totals.q1 += (entry.q1_1 || 0) + ((entry.q1_2 || 0) * 2) + ((entry.q1_3 || 0) * 3);
        totals.q2 += (entry.q2_1 || 0) + ((entry.q2_2 || 0) * 2) + ((entry.q2_3 || 0) * 3);
        totals.q3 += (entry.q3_1 || 0) + ((entry.q3_2 || 0) * 2) + ((entry.q3_3 || 0) * 3);
        totals.q4 += (entry.q4_1 || 0) + ((entry.q4_2 || 0) * 2) + ((entry.q4_3 || 0) * 3);
        totals.ot += (entry.ot_1 || 0) + ((entry.ot_2 || 0) * 2) + ((entry.ot_3 || 0) * 3);
    });

    totals.total = totals.q1 + totals.q2 + totals.q3 + totals.q4 + totals.ot;
    return totals;
}

function matchesWithSummary() {
    const schedule = state.scheduleData?.schedule || [];
    const matchStats = state.scheduleData?.matchStats || {};

    return schedule.map((match) => {
        const stats = matchStats[match.id] || {};
        const isCompleted = Boolean(stats.isCompleted);
        const scoreA = isCompleted ? getTeamTotals(stats[match.teamA]).total : null;
        const scoreB = isCompleted ? getTeamTotals(stats[match.teamB]).total : null;
        return { ...match, isCompleted, scoreA, scoreB };
    });
}

function completedMatches() {
    return matchesWithSummary().filter((match) => match.isCompleted);
}

function upcomingMatches() {
    return matchesWithSummary().filter((match) => !match.isCompleted);
}

function teamStanding(team) {
    return state.standings.find((row) => row.team === team);
}

function formatDiff(value) {
    return value > 0 ? `+${value}` : `${value}`;
}

function setOverviewStats() {
    const players = state.tournamentData?.allPlayers || [];
    const games = matchesWithSummary();
    const teams = Object.keys(state.scheduleData?.rosters || {});
    const completed = games.filter((match) => match.isCompleted).length;
    const totalThrees = state.tournamentData?.totalTournament3s || 0;

    const metrics = [
        { label: 'Teams', value: teams.length, note: 'Active clubs in the tournament' },
        { label: 'Games Completed', value: completed, note: `${games.length - completed} still to play` },
        { label: 'Stat Tracked Players', value: players.length, note: 'Players with tournament production' },
        { label: 'Tournament 3PM', value: totalThrees, note: 'Made three-pointers so far' }
    ];

    document.getElementById('overviewStats').innerHTML = metrics.map((metric) => `
        <div class="mini-stat">
            <div class="card-label">${metric.label}</div>
            <strong>${metric.value}</strong>
            <div class="muted">${metric.note}</div>
        </div>
    `).join('');
}

function renderFeaturedCards() {
    const latestCompleted = [...completedMatches()].sort((a, b) => b.id - a.id)[0];
    const nextUpcoming = [...upcomingMatches()].sort((a, b) => a.id - b.id)[0];
    const featuredMatch = nextUpcoming || latestCompleted;
    const matchCard = document.getElementById('featuredMatchCard');

    if (featuredMatch) {
        const isFinal = featuredMatch.isCompleted;
        const status = isFinal ? 'Latest Result' : 'Next Fixture';
        matchCard.innerHTML = isFinal ? `
            <div class="feature-label">${status}</div>
            <div class="feature-title">${featuredMatch.teamA} vs ${featuredMatch.teamB}</div>
            <p class="feature-copy">${featuredMatch.date || 'Date TBA'}</p>
            <div class="feature-score">
                <div class="score-side">${logoMarkup(featuredMatch.teamA, 50)}<div class="team-pill">${fullTeamName(featuredMatch.teamA)}</div><div class="score-badge">${featuredMatch.scoreA}</div></div>
                <div class="score-side"><div class="status-pill final">Result</div></div>
                <div class="score-side">${logoMarkup(featuredMatch.teamB, 50)}<div class="team-pill">${fullTeamName(featuredMatch.teamB)}</div><div class="score-badge">${featuredMatch.scoreB}</div></div>
            </div>
        ` : `
            <div class="feature-label">${status}</div>
            <div class="feature-title">${featuredMatch.teamA} vs ${featuredMatch.teamB}</div>
            <p class="feature-copy">${featuredMatch.date || 'Date TBA'}</p>
            <div class="feature-score">
                <div class="score-side">${logoMarkup(featuredMatch.teamA, 50)}<div class="team-pill">${fullTeamName(featuredMatch.teamA)}</div></div>
                <div class="score-side"><div class="status-pill upcoming">Upcoming</div></div>
                <div class="score-side">${logoMarkup(featuredMatch.teamB, 50)}<div class="team-pill">${fullTeamName(featuredMatch.teamB)}</div></div>
            </div>
        `;
    }

    const topPlayer = state.tournamentData?.leaders?.pts?.[0];
    const playerCard = document.getElementById('featuredPlayerCard');
    if (topPlayer) {
        playerCard.innerHTML = `
            <div class="feature-label">Tournament Points Leader</div>
            <div class="leader-top" style="margin-top:12px;">
                <img class="leader-photo" src="${photoUrl(topPlayer.photo)}" alt="${topPlayer.name}" onerror="this.src='/assets/tour_logo.png'">
                <div>
                    <div class="feature-title" style="font-size:32px;">${topPlayer.name}</div>
                    <p class="feature-copy">${fullTeamName(topPlayer.team)}</p>
                </div>
            </div>
            <div class="feature-score" style="margin-top:14px;">
                <div><div class="card-label">Total Points</div><div class="leader-value">${topPlayer.pts}</div></div>
                <button class="btn btn-secondary" type="button" onclick="openPlayerSheet('${topPlayer.team}', ${topPlayer.jersey})">Open Profile</button>
            </div>
        `;
    }
}

function renderFixtureFilters() {
    const filters = [
        { key: 'all', label: 'All Games' },
        { key: 'upcoming', label: 'Upcoming' },
        { key: 'completed', label: 'Results' }
    ];

    document.getElementById('fixtureFilters').innerHTML = filters.map((filter) => `
        <button class="filter-chip ${state.fixtureFilter === filter.key ? 'active' : ''}" type="button" onclick="setFixtureFilter('${filter.key}')">${filter.label}</button>
    `).join('');
}

function renderGames() {
    renderFixtureFilters();
    const matches = matchesWithSummary().filter((match) => {
        if (state.fixtureFilter === 'completed') return match.isCompleted;
        if (state.fixtureFilter === 'upcoming') return !match.isCompleted;
        return true;
    });

    const grid = document.getElementById('gamesGrid');
    if (!matches.length) {
        grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">No games found in this view yet.</div>';
        return;
    }

    grid.innerHTML = matches.map((match) => {
        const statusClass = match.isCompleted ? 'final' : 'upcoming';
        const statusLabel = match.isCompleted ? 'Result' : 'Upcoming';
        const action = match.isCompleted
            ? `<button class="btn btn-primary" type="button" onclick="openMatchModal(${match.id}, '${match.teamA}', '${match.teamB}')">View Box Score</button>`
            : `<button class="btn btn-secondary" type="button" onclick="document.getElementById('teams').scrollIntoView({ behavior: 'smooth' })">Browse Teams</button>`;

        return `
            <article class="game-card">
                <div class="game-meta"><span>Game ${match.id}</span><span class="status-pill ${statusClass}">${statusLabel}</span></div>
                <div class="muted">${match.date || 'Date TBA'}</div>
                <div class="matchup">
                    <div class="team-line">${logoMarkup(match.teamA, 42)}<div class="team-line-name">${fullTeamName(match.teamA)}</div><div class="team-line-score">${match.isCompleted ? match.scoreA : ''}</div></div>
                    <div class="team-line">${logoMarkup(match.teamB, 42)}<div class="team-line-name">${fullTeamName(match.teamB)}</div><div class="team-line-score">${match.isCompleted ? match.scoreB : ''}</div></div>
                </div>
                <div class="card-actions">${action}</div>
            </article>
        `;
    }).join('');
}

function setFixtureFilter(filterKey) {
    state.fixtureFilter = filterKey;
    renderGames();
}

function renderStandings() {
    document.getElementById('standingsBody').innerHTML = state.standings.map((row, index) => `
        <tr class="standings-row ${index < 4 ? 'playoff-zone' : ''}">
            <td class="rank-cell">${index + 1}</td>
            <td><div style="display:flex;align-items:center;gap:12px;">${logoMarkup(row.team, 30)}<strong>${fullTeamName(row.team)}</strong></div></td>
            <td>${row.played}</td><td>${row.wins}</td><td>${row.losses}</td><td>${row.pf}</td><td>${row.pa}</td>
            <td class="${row.pd >= 0 ? 'diff-pos' : 'diff-neg'}">${formatDiff(row.pd)}</td><td><strong>${row.pts}</strong></td>
        </tr>
    `).join('');
}

function renderHeadlineLeaders() {
    const groups = [
        { key: 'pts', label: 'Points' },
        { key: 'reb', label: 'Rebounds' },
        { key: 'ast', label: 'Assists' }
    ];

    document.getElementById('headlineLeaders').innerHTML = groups.map((group, index) => {
        const leader = state.tournamentData?.leaders?.[group.key]?.[0];
        if (!leader) {
            return `<div class="leader-card"><div class="card-label">${group.label}</div><div class="muted">No data yet.</div></div>`;
        }

        return `
            <div class="leader-card ${index === 0 ? 'is-primary' : ''}" onclick="openPlayerSheet('${leader.team}', ${leader.jersey})">
                <div class="card-label">${group.label} Leader</div>
                <div class="leader-top">
                    <img class="leader-photo" src="${photoUrl(leader.photo)}" alt="${leader.name}" onerror="this.src='/assets/tour_logo.png'">
                    <div class="leader-meta"><div class="player-name">${leader.name}</div><div class="muted">${fullTeamName(leader.team)}</div></div>
                </div>
                <div class="leader-value">${leader[group.key]}</div>
            </div>
        `;
    }).join('');
}

function teamLogoUrl(team) {
    return state.scheduleData?.teamLogos?.[team] || '/assets/tour_logo.png';
}

function buildSingleGamePlayerPerformances() {
    const matchStats = state.scheduleData?.matchStats || {};
    const rosters = state.scheduleData?.rosters || {};

    return completedMatches().flatMap((match) => {
        return [match.teamA, match.teamB].flatMap((team) => {
            const opponent = team === match.teamA ? match.teamB : match.teamA;
            const teamStats = matchStats[match.id]?.[team] || {};

            return Object.entries(teamStats).map(([jersey, stats]) => {
                const rosterPlayer = (rosters[team] || []).find((player) => player.jersey === Number(jersey));
                const pts = getTeamTotals({ temp: stats }).total;
                const threes = (stats.q1_3 || 0) + (stats.q2_3 || 0) + (stats.q3_3 || 0) + (stats.q4_3 || 0) + (stats.ot_3 || 0);

                return {
                    matchId: match.id,
                    date: match.date,
                    team,
                    opponent,
                    jersey: Number(jersey),
                    name: rosterPlayer?.name || `#${jersey}`,
                    photo: rosterPlayer?.photo || '',
                    pts,
                    reb: stats.reb || 0,
                    ast: stats.ast || 0,
                    stl: stats.stl || 0,
                    blk: stats.blk || 0,
                    threes
                };
            });
        });
    });
}

function buildTeamGameRecords() {
    return completedMatches().flatMap((match) => {
        const scoreA = match.scoreA || 0;
        const scoreB = match.scoreB || 0;
        return [
            { team: match.teamA, opponent: match.teamB, date: match.date, score: scoreA, conceded: scoreB, margin: scoreA - scoreB, combined: scoreA + scoreB },
            { team: match.teamB, opponent: match.teamA, date: match.date, score: scoreB, conceded: scoreA, margin: scoreB - scoreA, combined: scoreA + scoreB }
        ];
    });
}

function renderRecords() {
    const playerGames = buildSingleGamePlayerPerformances().filter((entry) => entry.pts || entry.reb || entry.ast || entry.stl || entry.blk || entry.threes);
    const teamGames = buildTeamGameRecords();
    const singleGameLeaders = state.tournamentData?.singleGameLeaders || {};

    const topScorer = [...playerGames].sort((a, b) => b.pts - a.pts)[0];
    const topTeamScore = [...teamGames].sort((a, b) => b.score - a.score)[0];
    const biggestWin = [...teamGames].sort((a, b) => b.margin - a.margin)[0];
    const highestCombined = [...teamGames].sort((a, b) => b.combined - a.combined)[0];
    const topThrees = [...playerGames].sort((a, b) => b.threes - a.threes)[0];
    const topRebounds = [...playerGames].sort((a, b) => b.reb - a.reb)[0];

    const cards = [
        topScorer && {
            label: 'Highest Individual Score',
            title: topScorer.name,
            value: `${topScorer.pts} PTS`,
            footnote: `${fullTeamName(topScorer.team)} vs ${fullTeamName(topScorer.opponent)} • ${topScorer.date}`,
            photo: photoUrl(topScorer.photo),
            teamLogo: teamLogoUrl(topScorer.team)
        },
        topTeamScore && {
            label: 'Highest Team Score',
            title: fullTeamName(topTeamScore.team),
            value: `${topTeamScore.score} PTS`,
            footnote: `vs ${fullTeamName(topTeamScore.opponent)} • ${topTeamScore.date}`,
            photo: teamLogoUrl(topTeamScore.team),
            teamLogo: teamLogoUrl(topTeamScore.opponent)
        },
        biggestWin && {
            label: 'Biggest Winning Margin',
            title: fullTeamName(biggestWin.team),
            value: `${biggestWin.margin > 0 ? '+' : ''}${biggestWin.margin}`,
            footnote: `vs ${fullTeamName(biggestWin.opponent)} • ${biggestWin.date}`,
            photo: teamLogoUrl(biggestWin.team),
            teamLogo: teamLogoUrl(biggestWin.opponent)
        },
        highestCombined && {
            label: 'Highest Scoring Match',
            title: `${fullTeamName(highestCombined.team)} vs ${fullTeamName(highestCombined.opponent)}`,
            value: `${highestCombined.combined} PTS`,
            footnote: `${highestCombined.date}`,
            photo: teamLogoUrl(highestCombined.team),
            teamLogo: teamLogoUrl(highestCombined.opponent)
        },
        topThrees && {
            label: 'Most Threes In A Match',
            title: topThrees.name,
            value: `${topThrees.threes} 3PM`,
            footnote: `${fullTeamName(topThrees.team)} vs ${fullTeamName(topThrees.opponent)}`,
            photo: photoUrl(topThrees.photo),
            teamLogo: teamLogoUrl(topThrees.team)
        },
        topRebounds && {
            label: 'Most Rebounds In A Match',
            title: topRebounds.name,
            value: `${topRebounds.reb} REB`,
            footnote: `${fullTeamName(topRebounds.team)} vs ${fullTeamName(topRebounds.opponent)}`,
            photo: photoUrl(topRebounds.photo),
            teamLogo: teamLogoUrl(topRebounds.team)
        }
    ].filter(Boolean);

    document.getElementById('recordsGrid').innerHTML = cards.map((card) => `
        <article class="record-card">
            <div class="card-label">${card.label}</div>
            <div class="record-top">
                <img class="record-photo" src="${card.photo}" alt="${card.title}" onerror="this.src='/assets/tour_logo.png'">
                <div class="record-title-wrap"><h3>${card.title}</h3></div>
                <img class="record-team-logo" src="${card.teamLogo}" alt="team logo" onerror="this.src='/assets/tour_logo.png'">
            </div>
            <div class="record-value">${card.value}</div>
            <div class="record-footnote">${card.footnote}</div>
        </article>
    `).join('');
}

function renderPlayoffPicture() {
    const seeds = state.standings.slice(0, 4);
    const container = document.getElementById('playoffPicture');
    if (!seeds.length) {
        container.innerHTML = '<div class="muted">Current playoff picture will appear here once standings are available.</div>';
        return;
    }

    container.innerHTML = `
        <div class="card-label">Current Top Four Picture</div>
        <div class="muted">Based on the latest completed games, these teams currently occupy the playoff positions for the Season 2 finals bracket.</div>
        <div class="playoff-seeds">
            ${seeds.map((team, index) => `
                <div class="seed-card">
                    <div class="card-label">Seed ${index + 1}</div>
                    <div style="display:flex;align-items:center;gap:10px;">${logoMarkup(team.team, 34)}<strong>${fullTeamName(team.team)}</strong></div>
                    <div class="muted">${team.wins}-${team.losses} • ${team.pts} pts</div>
                </div>
            `).join('')}
        </div>
        <div class="playoff-bracket">
            <div class="bracket-column">
                <div class="bracket-match">
                    <div class="bracket-label">Qualifier 1</div>
                    <div class="bracket-team"><img src="${teamLogoUrl(seeds[0].team)}" alt="${seeds[0].team}"><div><strong>${fullTeamName(seeds[0].team)}</strong><span>Seed 1</span></div></div>
                    <div class="bracket-team"><img src="${teamLogoUrl(seeds[1].team)}" alt="${seeds[1].team}"><div><strong>${fullTeamName(seeds[1].team)}</strong><span>Seed 2</span></div></div>
                    <div class="bracket-note">Winner goes directly to the final.</div>
                </div>
                <div class="bracket-match">
                    <div class="bracket-label">Eliminator</div>
                    <div class="bracket-team"><img src="${teamLogoUrl(seeds[2].team)}" alt="${seeds[2].team}"><div><strong>${fullTeamName(seeds[2].team)}</strong><span>Seed 3</span></div></div>
                    <div class="bracket-team"><img src="${teamLogoUrl(seeds[3].team)}" alt="${seeds[3].team}"><div><strong>${fullTeamName(seeds[3].team)}</strong><span>Seed 4</span></div></div>
                    <div class="bracket-note">Loser is eliminated.</div>
                </div>
            </div>
            <div class="bracket-column center">
                <div class="bracket-match">
                    <div class="bracket-label">Qualifier 2</div>
                    <div class="bracket-team bracket-team-placeholder"><div class="bracket-placeholder-badge">Q1-L</div><div><strong>Loser Qualifier 1</strong><span>Second chance route</span></div></div>
                    <div class="bracket-team bracket-team-placeholder"><div class="bracket-placeholder-badge">E-W</div><div><strong>Winner Eliminator</strong><span>Must win again</span></div></div>
                    <div class="bracket-note">Winner reaches the final.</div>
                </div>
            </div>
            <div class="bracket-column">
                <div class="bracket-match final-match">
                    <div class="bracket-label">Final</div>
                    <div class="bracket-team bracket-team-placeholder"><div class="bracket-placeholder-badge">Q1-W</div><div><strong>Winner Qualifier 1</strong><span>Direct finalist</span></div></div>
                    <div class="bracket-team bracket-team-placeholder"><div class="bracket-placeholder-badge">Q2-W</div><div><strong>Winner Qualifier 2</strong><span>Survives the bracket</span></div></div>
                    <div class="bracket-note">Championship game for HJNBL Season 2.</div>
                </div>
            </div>
        </div>
    `;
}

function populateTeamFilter() {
    const teams = Object.keys(state.scheduleData?.rosters || {}).sort();
    const select = document.getElementById('playerTeamFilter');
    select.innerHTML = '<option value="ALL">All Teams</option>' + teams.map((team) => `<option value="${team}">${fullTeamName(team)}</option>`).join('');
}

function filteredPlayers() {
    const players = state.tournamentData?.allPlayers || [];
    const search = document.getElementById('playerSearch').value.trim().toLowerCase();
    const sortKey = document.getElementById('playerSort').value;
    const team = document.getElementById('playerTeamFilter').value;

    return [...players]
        .filter((player) => {
            const searchHit = !search || player.name.toLowerCase().includes(search) || fullTeamName(player.team).toLowerCase().includes(search);
            const teamHit = team === 'ALL' || player.team === team;
            return searchHit && teamHit;
        })
        .sort((a, b) => (b[sortKey] || 0) - (a[sortKey] || 0) || b.pts - a.pts || a.name.localeCompare(b.name));
}

function renderPlayers() {
    const sortKey = document.getElementById('playerSort').value;
    const players = filteredPlayers();
    const highlights = document.getElementById('playerHighlights');
    const tableBody = document.getElementById('playersTableBody');
    const loadMoreBtn = document.getElementById('playersLoadMoreBtn');

    if (!players.length) {
        highlights.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">No players match this filter.</div>';
        tableBody.innerHTML = '';
        loadMoreBtn.style.display = 'none';
        return;
    }

    highlights.innerHTML = players.slice(0, 4).map((player, index) => `
        <div class="player-spotlight" onclick="openPlayerSheet('${player.team}', ${player.jersey})">
            <div class="card-label">${index === 0 ? 'Featured' : 'Trending'} ${statOptions[sortKey]}</div>
            <div class="player-topline">
                <img src="${photoUrl(player.photo)}" alt="${player.name}" onerror="this.src='/assets/tour_logo.png'">
                <div><div class="player-name">${player.name}</div><div class="muted">${fullTeamName(player.team)} • #${player.jersey}</div></div>
            </div>
            <div class="player-value">${player[sortKey] || 0}</div>
        </div>
    `).join('');

    const visiblePlayers = players.slice(0, state.playerVisibleCount);
    tableBody.innerHTML = visiblePlayers.map((player) => `
        <tr class="player-row" onclick="openPlayerSheet('${player.team}', ${player.jersey})">
            <td><div style="display:flex;align-items:center;gap:12px;"><img src="${photoUrl(player.photo)}" alt="${player.name}" onerror="this.src='/assets/tour_logo.png'" style="width:42px;height:42px;border-radius:12px;object-fit:cover;object-position:top;border:1px solid rgba(255,255,255,.1);"><div><strong>${player.name}</strong><div class="muted">#${player.jersey}</div></div></div></td>
            <td>${fullTeamName(player.team)}</td><td>${player.gp}</td><td><strong>${player.pts}</strong></td><td>${player.reb}</td><td>${player.ast}</td><td>${player.threes}</td><td>${player.stl}</td><td>${player.blk}</td>
        </tr>
    `).join('');

    if (players.length <= 10) {
        loadMoreBtn.style.display = 'none';
    } else {
        loadMoreBtn.style.display = 'inline-flex';
        loadMoreBtn.textContent = state.playerVisibleCount >= players.length ? 'Show Top 10 Only' : `Load More Players (${players.length - state.playerVisibleCount} more)`;
    }
}

function renderTeams() {
    const teams = Object.entries(state.scheduleData?.rosters || {});
    document.getElementById('teamsGrid').innerHTML = teams.map(([team, roster]) => {
        const standing = teamStanding(team);
        const totals = state.tournamentData?.teamTotals?.[team] || {};
        return `
            <article class="team-card" onclick="openTeamDrawer('${team}')">
                <div style="display:flex;justify-content:space-between;gap:14px;align-items:start;">
                    <div class="team-logo-wrap">${logoMarkup(team, 64)}</div>
                    <div class="status-pill ${standing && standing.played > 0 ? 'final' : 'upcoming'}">${standing ? `${standing.wins}-${standing.losses}` : 'Roster'}</div>
                </div>
                <div><h3>${team}</h3><div class="team-meta">${fullTeamName(team)}</div></div>
                <div class="team-card-stats">
                    <div><div class="card-label">Roster</div><span>${roster.length}</span></div>
                    <div><div class="card-label">GP</div><span>${totals.gp || 0}</span></div>
                    <div><div class="card-label">PTS</div><span>${totals.pts || 0}</span></div>
                </div>
            </article>
        `;
    }).join('');
}

function buildPlayerStatsMap(team) {
    const map = {};
    (state.tournamentData?.allPlayers || []).forEach((player) => {
        if (player.team === team) map[player.jersey] = player;
    });
    return map;
}

function openTeamDrawer(team) {
    const roster = state.scheduleData?.rosters?.[team] || [];
    const statsMap = buildPlayerStatsMap(team);
    document.getElementById('teamDrawerTitle').textContent = `${fullTeamName(team)} Roster`;
    document.getElementById('teamRosterGrid').innerHTML = roster.map((player) => {
        const stats = statsMap[player.jersey] || {};
        return `
            <div class="roster-card" onclick="openPlayerSheet('${team}', ${player.jersey}, true)">
                <img class="roster-photo" src="${photoUrl(player.photo)}" alt="${player.name}" onerror="this.src='/assets/tour_logo.png'">
                <div>
                    <strong>${player.name}</strong>
                    <div class="muted">${player.position || 'Position TBA'} • ${player.height || '-'} • Age ${player.age || '-'}</div>
                    <div class="muted">${stats.gp || 0} GP • ${stats.pts || 0} PTS • ${stats.reb || 0} REB • ${stats.ast || 0} AST</div>
                </div>
                <div class="jersey-chip">#${player.jersey}</div>
            </div>
        `;
    }).join('');
    document.getElementById('teamDrawerOverlay').classList.add('open');
    document.querySelector('#teamDrawerOverlay .team-drawer')?.scrollTo({ top: 0, behavior: 'auto' });
}

function closeTeamDrawer() {
    document.getElementById('teamDrawerOverlay').classList.remove('open');
}

function getRosterPlayer(team, jersey) {
    return (state.scheduleData?.rosters?.[team] || []).find((player) => player.jersey === Number(jersey));
}

function getTournamentPlayer(team, jersey) {
    return (state.tournamentData?.allPlayers || []).find((player) => player.team === team && player.jersey === Number(jersey));
}

function openPlayerSheet(team, jersey, keepTeamDrawerOpen = false) {
    const rosterPlayer = getRosterPlayer(team, jersey);
    if (!rosterPlayer) return;

    const stats = getTournamentPlayer(team, jersey) || { team, jersey: rosterPlayer.jersey, gp: 0, pts: 0, reb: 0, ast: 0, threes: 0, stl: 0, blk: 0, tov: 0 };
    const ppg = stats.gp ? (stats.pts / stats.gp).toFixed(1) : '0.0';

    document.getElementById('playerSheetTitle').textContent = rosterPlayer.name;
    document.getElementById('playerSheetBody').innerHTML = `
        <div class="sheet-profile">
            <img class="sheet-photo" src="${photoUrl(rosterPlayer.photo)}" alt="${rosterPlayer.name}" onerror="this.src='/assets/tour_logo.png'">
            <div class="player-name">${rosterPlayer.name}</div>
            <div class="muted">${fullTeamName(team)}</div>
            <div class="muted" style="margin-top:6px;">#${rosterPlayer.jersey} • ${rosterPlayer.position || 'Position TBA'}</div>
            <div class="muted">${rosterPlayer.height || '-'} • Age ${rosterPlayer.age || '-'}</div>
            <div style="margin-top:14px;display:flex;justify-content:center;">${logoMarkup(team, 76)}</div>
        </div>
        <div>
            <div class="sheet-stats">
                <div class="sheet-stat"><div class="card-label">Games Played</div><strong>${stats.gp || 0}</strong></div>
                <div class="sheet-stat"><div class="card-label">Points</div><strong>${stats.pts || 0}</strong></div>
                <div class="sheet-stat"><div class="card-label">PPG</div><strong>${ppg}</strong></div>
                <div class="sheet-stat"><div class="card-label">Rebounds</div><strong>${stats.reb || 0}</strong></div>
                <div class="sheet-stat"><div class="card-label">Assists</div><strong>${stats.ast || 0}</strong></div>
                <div class="sheet-stat"><div class="card-label">3-Pointers</div><strong>${stats.threes || 0}</strong></div>
                <div class="sheet-stat"><div class="card-label">Steals</div><strong>${stats.stl || 0}</strong></div>
                <div class="sheet-stat"><div class="card-label">Blocks</div><strong>${stats.blk || 0}</strong></div>
                <div class="sheet-stat"><div class="card-label">Turnovers</div><strong>${stats.tov || 0}</strong></div>
            </div>
        </div>
    `;

    document.getElementById('playerSheetOverlay').classList.add('open');
    document.querySelector('#playerSheetOverlay .player-sheet')?.scrollTo({ top: 0, behavior: 'auto' });
    if (!keepTeamDrawerOpen) closeTeamDrawer();
}

function closePlayerSheet() {
    document.getElementById('playerSheetOverlay').classList.remove('open');
}

function buildBoxScoreTable(team, roster, stats) {
    const rows = (roster || []).map((player) => {
        const entry = stats?.[player.jersey] || {};
        const q1 = (entry.q1_1 || 0) + ((entry.q1_2 || 0) * 2) + ((entry.q1_3 || 0) * 3);
        const q2 = (entry.q2_1 || 0) + ((entry.q2_2 || 0) * 2) + ((entry.q2_3 || 0) * 3);
        const q3 = (entry.q3_1 || 0) + ((entry.q3_2 || 0) * 2) + ((entry.q3_3 || 0) * 3);
        const q4 = (entry.q4_1 || 0) + ((entry.q4_2 || 0) * 2) + ((entry.q4_3 || 0) * 3);
        const ot = (entry.ot_1 || 0) + ((entry.ot_2 || 0) * 2) + ((entry.ot_3 || 0) * 3);
        const total = q1 + q2 + q3 + q4 + ot;
        const hasAction = total || entry.reb || entry.ast || entry.stl || entry.blk || entry.tov || entry.foul;
        if (!hasAction) return '';

        return `
            <tr class="player-row" onclick="openPlayerSheet('${team}', ${player.jersey})">
                <td><strong>#${player.jersey}</strong> ${player.name}</td>
                <td>${total}</td><td>${entry.reb || 0}</td><td>${entry.ast || 0}</td><td>${entry.stl || 0}</td><td>${entry.blk || 0}</td><td>${entry.tov || 0}</td>
            </tr>
        `;
    }).join('');

    return `
        <div class="team-box">
            <div class="box-title">${logoMarkup(team, 34)}<span>${fullTeamName(team)}</span></div>
            <div class="table-wrap">
                <table>
                    <thead><tr><th>Player</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TOV</th></tr></thead>
                    <tbody>${rows || '<tr><td colspan="7" class="muted">No recorded stats yet.</td></tr>'}</tbody>
                </table>
            </div>
        </div>
    `;
}

async function openMatchModal(id, teamA, teamB) {
    const res = await fetch(`/api/match/${id}`);
    const data = await res.json();
    const totalsA = getTeamTotals(data.stats?.[teamA]);
    const totalsB = getTeamTotals(data.stats?.[teamB]);

    document.getElementById('matchModalTitle').textContent = `${fullTeamName(teamA)} vs ${fullTeamName(teamB)}`;
    document.getElementById('matchModalBody').innerHTML = `
        <div class="score-ribbon">
            <div class="score-ribbon-grid">
                <div class="score-ribbon-team">${logoMarkup(teamA, 72)}<div class="team-pill">${fullTeamName(teamA)}</div><div class="score-ribbon-total">${totalsA.total}</div></div>
                <div class="score-ribbon-divider">-</div>
                <div class="score-ribbon-team">${logoMarkup(teamB, 72)}<div class="team-pill">${fullTeamName(teamB)}</div><div class="score-ribbon-total">${totalsB.total}</div></div>
            </div>
            <div class="muted" style="margin-top:12px;text-align:center;">Quarter totals: ${totalsA.q1}-${totalsA.q2}-${totalsA.q3}-${totalsA.q4}${totalsA.ot ? ` OT ${totalsA.ot}` : ''} and ${totalsB.q1}-${totalsB.q2}-${totalsB.q3}-${totalsB.q4}${totalsB.ot ? ` OT ${totalsB.ot}` : ''}</div>
        </div>
        <div class="box-columns">
            ${buildBoxScoreTable(teamA, data.rosters?.[teamA], data.stats?.[teamA])}
            ${buildBoxScoreTable(teamB, data.rosters?.[teamB], data.stats?.[teamB])}
        </div>
    `;

    document.getElementById('matchModal').classList.add('open');
    document.querySelector('#matchModal .modal-content')?.scrollTo({ top: 0, behavior: 'auto' });
}

function closeMatchModal() {
    document.getElementById('matchModal').classList.remove('open');
}

function togglePlayersLoadMore() {
    const players = filteredPlayers();
    state.playerVisibleCount = state.playerVisibleCount >= players.length ? 10 : state.playerVisibleCount + 10;
    renderPlayers();
}

function attachEvents() {
    document.getElementById('playerSearch').addEventListener('input', () => { state.playerVisibleCount = 10; renderPlayers(); });
    document.getElementById('playerSort').addEventListener('change', () => { state.playerVisibleCount = 10; renderPlayers(); });
    document.getElementById('playerTeamFilter').addEventListener('change', () => { state.playerVisibleCount = 10; renderPlayers(); });
    document.getElementById('playersLoadMoreBtn').addEventListener('click', togglePlayersLoadMore);

    ['matchModal', 'teamDrawerOverlay', 'playerSheetOverlay'].forEach((id) => {
        document.getElementById(id).addEventListener('click', (event) => {
            if (event.target.id !== id) return;
            if (id === 'matchModal') closeMatchModal();
            if (id === 'teamDrawerOverlay') closeTeamDrawer();
            if (id === 'playerSheetOverlay') closePlayerSheet();
        });
    });
}

async function init() {
    try {
        const [scheduleRes, tournamentRes, standingsRes] = await Promise.all([
            fetch('/api/schedule'),
            fetch('/api/tournament-stats'),
            fetch('/api/standings')
        ]);

        state.scheduleData = await scheduleRes.json();
        state.tournamentData = await tournamentRes.json();
        state.standings = await standingsRes.json();

        setOverviewStats();
        renderFeaturedCards();
        renderGames();
        renderStandings();
        renderHeadlineLeaders();
        renderRecords();
        populateTeamFilter();
        renderPlayers();
        renderTeams();
        renderPlayoffPicture();
        attachEvents();
    } catch (error) {
        console.error('Failed to initialize HJNBL portal', error);
        document.getElementById('gamesGrid').innerHTML = '<div class="empty-state" style="grid-column:1/-1;">Failed to load tournament data. Please check the server connection.</div>';
    }
}

init();

