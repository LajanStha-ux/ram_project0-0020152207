const PLAYOFF_PAGE_CONFIG = {
    eliminator2: {
        matchId: 59,
        title: 'Eliminator 2',
        subtitle: 'One last push to the final.',
        stake: 'Winner reaches the final. Loser ends the season here.',
        accentClass: 'is-eliminator'
    },
    final: {
        matchId: 60,
        title: 'HJNBL Final',
        subtitle: 'One game for the crown.',
        stake: 'The last game of the season decides the HJNBL Season 2 champion.',
        accentClass: 'is-final'
    }
};

const PLAYOFF_TEAM_NAMES = {
    KIRTIPUR: 'IIMS Kirtipur',
    TIMES: 'Times Club',
    SOLO: 'Solo Basketball Academy',
    ARMY: 'Tribhuwan Army Club',
    ROYAL: 'Royal',
    'KVC HOUNDS': 'KVC Hounds',
    GGIC: 'Golden Gate International',
    PLAYBOX: 'Playbox Arena',
    'QUALIFIER 1 LOSER': 'Qualifier 1 Loser',
    'ELIMINATOR 1 WINNER': 'Winner Eliminator 1',
    'ELIMINATOR 2 WINNER': 'Winner Eliminator 2'
};

const TICKET_LINK = 'https://www.ticketsanjal.com/events/282';
const WATCH_LINK = 'https://www.youtube.com/@WatchDGO';
const PLAYLIST_LINK = 'https://www.youtube.com/playlist?list=PLt2JXivkzbis7vapKY-A1wRBommM-sQjl';

function playoffTeamName(team) {
    return PLAYOFF_TEAM_NAMES[team] || team;
}

function playoffLogoUrl(scheduleData, team) {
    return scheduleData?.teamLogos?.[team] || '/assets/tour_logo.png';
}

function cheerTag(team) {
    const full = playoffTeamName(team);
    if (team === 'ARMY') return 'Stand tall for TAC.';
    if (team === 'GGIC') return 'Bring the Golden Gate noise.';
    if (team === 'TIMES') return 'Back Times all the way.';
    if (team === 'KVC HOUNDS') return 'Run with the Hounds.';
    if (team.includes('WINNER') || team.includes('LOSER')) return 'The bracket decides the next name here.';
    return `Lift ${full} from the first whistle.`;
}

function computeScore(statsBlock) {
    if (!statsBlock) return 0;
    return Object.values(statsBlock).reduce((total, s) => {
        return total
            + (s.q1_1 || 0) + ((s.q1_2 || 0) * 2) + ((s.q1_3 || 0) * 3)
            + (s.q2_1 || 0) + ((s.q2_2 || 0) * 2) + ((s.q2_3 || 0) * 3)
            + (s.q3_1 || 0) + ((s.q3_2 || 0) * 2) + ((s.q3_3 || 0) * 3)
            + (s.q4_1 || 0) + ((s.q4_2 || 0) * 2) + ((s.q4_3 || 0) * 3)
            + (s.ot_1 || 0) + ((s.ot_2 || 0) * 2) + ((s.ot_3 || 0) * 3);
    }, 0);
}

function matchupStatus(match, stats) {
    if (!stats?.isCompleted) {
        return `${match.stage || match.round} • ${match.date}`;
    }
    const scoreA = computeScore(stats[match.teamA]);
    const scoreB = computeScore(stats[match.teamB]);
    return `Final • ${match.date} • ${scoreA}-${scoreB}`;
}

function renderPlayoffPage(scheduleData, standings) {
    const root = document.getElementById('playoffPageRoot');
    const body = document.body;
    const pageType = body.dataset.pageType;
    const config = PLAYOFF_PAGE_CONFIG[pageType];
    const matchId = Number(body.dataset.matchId || config.matchId);
    const match = (scheduleData.schedule || []).find((item) => Number(item.id) === matchId);
    const matchStats = scheduleData.matchStats?.[matchId];

    if (!match) {
        root.innerHTML = '<div class="muted">Playoff page data is not available yet.</div>';
        return;
    }

    const teamAStanding = standings.find((row) => row.team === match.teamA);
    const teamBStanding = standings.find((row) => row.team === match.teamB);
    const teamAScore = matchStats?.isCompleted ? computeScore(matchStats[match.teamA]) : null;
    const teamBScore = matchStats?.isCompleted ? computeScore(matchStats[match.teamB]) : null;

    root.innerHTML = `
        <section class="playoff-hero ${config.accentClass}">
            <div class="playoff-hero-copy">
                <div class="eyebrow">${config.title}</div>
                <h1 class="playoff-hero-title">${config.subtitle}</h1>
                <p class="playoff-hero-copyline">${config.stake}</p>
                <div class="playoff-status-line">${matchupStatus(match, matchStats)}</div>
                <div class="playoff-actions">
                    <a class="btn btn-primary" href="${TICKET_LINK}" target="_blank" rel="noopener noreferrer">Book Tickets</a>
                    <a class="btn btn-secondary" href="${WATCH_LINK}" target="_blank" rel="noopener noreferrer">Watch Live</a>
                    <a class="btn btn-secondary" href="${PLAYLIST_LINK}" target="_blank" rel="noopener noreferrer">Open Playlist</a>
                </div>
            </div>
            <div class="playoff-matchup-board">
                <article class="playoff-team-panel">
                    <img class="playoff-team-logo" src="${playoffLogoUrl(scheduleData, match.teamA)}" alt="${playoffTeamName(match.teamA)} logo" onerror="this.src='/assets/tour_logo.png'">
                    <div class="playoff-team-name">${playoffTeamName(match.teamA)}</div>
                    <div class="playoff-team-meta">${teamAStanding ? `League seed ${standings.findIndex((row) => row.team === match.teamA) + 1}` : 'Bracket spot locked'}</div>
                    <div class="playoff-team-chant">${cheerTag(match.teamA)}</div>
                    ${teamAScore !== null ? `<div class="playoff-team-score">${teamAScore}</div>` : ''}
                </article>
                <div class="playoff-versus">${matchStats?.isCompleted ? 'Final' : 'Vs'}</div>
                <article class="playoff-team-panel">
                    <img class="playoff-team-logo" src="${playoffLogoUrl(scheduleData, match.teamB)}" alt="${playoffTeamName(match.teamB)} logo" onerror="this.src='/assets/tour_logo.png'">
                    <div class="playoff-team-name">${playoffTeamName(match.teamB)}</div>
                    <div class="playoff-team-meta">${teamBStanding ? `League seed ${standings.findIndex((row) => row.team === match.teamB) + 1}` : 'Bracket spot locked'}</div>
                    <div class="playoff-team-chant">${cheerTag(match.teamB)}</div>
                    ${teamBScore !== null ? `<div class="playoff-team-score">${teamBScore}</div>` : ''}
                </article>
            </div>
        </section>
        <section class="playoff-info-grid">
            <article class="playoff-info-card">
                <div class="card-label">Venue</div>
                <strong>Dashrath Rangasala Covered Hall</strong>
                <p class="muted">Show up loud, show up early, and turn the arena into a playoff wall.</p>
            </article>
            <article class="playoff-info-card">
                <div class="card-label">Matchday Energy</div>
                <strong>${match.round}</strong>
                <p class="muted">${match.date} • ${match.stage || 'Playoffs'} • HJNBL Season 2</p>
            </article>
            <article class="playoff-info-card">
                <div class="card-label">What To Do</div>
                <strong>Tickets, live stream, and share</strong>
                <p class="muted">Use this page as a clean playoff link for fans before tip-off.</p>
            </article>
        </section>
    `;
}

async function initPlayoffPage() {
    try {
        const [scheduleRes, standingsRes] = await Promise.all([
            fetch('/api/schedule'),
            fetch('/api/standings')
        ]);
        const scheduleData = await scheduleRes.json();
        const standings = await standingsRes.json();
        renderPlayoffPage(scheduleData, standings);
    } catch (error) {
        console.error('Failed to load playoff page', error);
        document.getElementById('playoffPageRoot').innerHTML = '<div class="muted">Failed to load playoff page data.</div>';
    }
}

initPlayoffPage();
