SORTING_QUESTIONS = [
    {
        "id": "mountains_height",
        "title": "Mountains & Peaks",
        "prompt": "Sort these by height above mean sea level, from high (top) to low (bottom).",
        "criterion": "Height (m)",
        "labels": {"more": "taller", "less": "shorter"},
        "direction": "desc",
        "start_id": "kilimanjaro",
        "items": [
            {"id": "annapurna", "label": "Annapurna", "value": 8091, "unit": "m"},
            {"id": "kilimanjaro", "label": "Mount Kilimanjaro", "value": 5895, "unit": "m"},
            {"id": "matterhorn", "label": "Matterhorn", "value": 4478, "unit": "m"},
            {"id": "maunakea", "label": "Mauna Kea", "value": 4207, "unit": "m"},
            {"id": "fuji", "label": "Mount Fuji", "value": 3776, "unit": "m"},
            {"id": "vesuvius", "label": "Mount Vesuvius", "value": 1281, "unit": "m"},
            {"id": "uetliberg", "label": "Uetliberg", "value": 870, "unit": "m"},
            {"id": "templemount", "label": "Temple Mount", "value": 750, "unit": "m"},
            {"id": "sugarloaf", "label": "Sugarloaf Mountain", "value": 396, "unit": "m"},
        ],
        # With 9 items, teams will place 8, leaving 1 leftover.
    },

    {
        "id": "planets_size",
        "title": "Space",
        "prompt": "Sort these planets by diameter, from largest to smallest.",
        "criterion": "Diameter (km)",
        "direction": "desc",
        "start_id": "earth",
        "items": [
            {"id": "jupiter", "label": "Jupiter", "value": 139820, "unit": "km"},
            {"id": "saturn", "label": "Saturn", "value": 116460, "unit": "km"},
            {"id": "uranus", "label": "Uranus", "value": 50724, "unit": "km"},
            {"id": "neptune", "label": "Neptune", "value": 49244, "unit": "km"},
            {"id": "earth", "label": "Earth", "value": 12742, "unit": "km"},
            {"id": "venus", "label": "Venus", "value": 12104, "unit": "km"},
            {"id": "mars", "label": "Mars", "value": 6779, "unit": "km"},
            {"id": "mercury", "label": "Mercury", "value": 4879, "unit": "km"},
            {"id": "moon", "label": "The Moon (not a planet!)", "value": 3475, "unit": "km"},
        ],
    },

    {
        "id": "movies_release",
        "title": "Movies",
        "prompt": "Sort these movies by release year, from oldest to newest.",
        "criterion": "Release year",
        "direction": "asc",
        "labels": {"more": "later", "less": "earlier"},
        "start_id": "matrix",
        "items": [
            {"id": "godfather", "label": "The Godfather", "value": 1972, "unit": ""},
            {"id": "jaws", "label": "Jaws", "value": 1975, "unit": ""},
            {"id": "starwars", "label": "Star Wars: A New Hope", "value": 1977, "unit": ""},
            {"id": "terminator2", "label": "Terminator 2", "value": 1991, "unit": ""},
            {"id": "matrix", "label": "The Matrix", "value": 1999, "unit": ""},
            {"id": "lotr", "label": "The Lord of the Rings: The Fellowship of the Ring", "value": 2001, "unit": ""},
            {"id": "darkknight", "label": "The Dark Knight", "value": 2008, "unit": ""},
            {"id": "inception", "label": "Inception", "value": 2010, "unit": ""},
            {"id": "avengers", "label": "Avengers: Endgame", "value": 2019, "unit": ""},
        ],
    },
]


QUESTIONS_BY_MODE = {
    "sorting": SORTING_QUESTIONS,
}