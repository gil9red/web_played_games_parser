// parser.js

const FINISHED_GAME        = 'FINISHED_GAME';
const NOT_FINISHED_GAME    = 'NOT_FINISHED_GAME';
const FINISHED_WATCHED     = 'FINISHED_WATCHED';
const NOT_FINISHED_WATCHED = 'NOT_FINISHED_WATCHED';


const CATEGORY_BY_TITLE = new Map([
    [FINISHED_GAME,        "Пройденные"],
    [NOT_FINISHED_GAME,    "Не закончено прохождение"],
    [FINISHED_WATCHED,     "Просмотренные"],
    [NOT_FINISHED_WATCHED, "Не закончен просмотр"],
]);


function getJsonForTreeView(platforms) {
    let data = [];

    for (let [platform_name, categories] of Object.entries(platforms)) {
        platform = {
            class: 'platform noselect text-truncate',
            text: platform_name,
            nodes: [],
            tags: [],
        };

        let total_games = 0;

        for (let [category_name, games] of Object.entries(categories)) {
            let total = games.length;
            total_games += total;

            category = {
                class: `category ${category_name} noselect text-truncate`,
                text: CATEGORY_BY_TITLE.get(category_name),
                nodes: [],
                tags: [`${total}`],
            };
            platform.nodes.push(category);

            for (let game_name of games) {
                category.nodes.push({
                    class: `game ${category_name} noselect text-truncate`,
                    text: game_name,
                });
            }
        }

        platform.tags.push(`${total_games}`);

        data.push(platform);
    }
    return data;
}


function deep_compare(a, b) {
	if (typeof a !== typeof b) {
		return false;
    }

	if (typeof a !== 'object') {
		return a === b;
	}

	if (Object.keys(a).length != Object.keys(b).length) {
		return false;
    }

	if (Array.isArray(a) && Array.isArray(b)) {
		a.sort();
		b.sort();
	}

    if (a instanceof Map && b instanceof Map) {
        if (a.size != b.size) {
            return false;
        }

        for (let k of a.keys()) {
            if (!b.has(k)) {
                return false;
            }

            if (!deep_compare(a.get(k), b.get(k))) {
                return false;
            }
        }
    }

	for (let k in a) {
		if (!(k in b)) {
			return false;
        }

		if (!deep_compare(a[k], b[k])) {
			return false;
		}
	}

	return true;
}
