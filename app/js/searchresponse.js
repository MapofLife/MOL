{    
    "query": {
        "search": "Puma",
        "offset": 0,
        "limit": 10,
        "source": null,
        "type": null,
        "advancedOption1": "foo",
        "advancedOption2": "bar"
    },

    "types": {
        "points": {
            "names": ["Puma concolor"],
            "sources": ["GBIF"],
            "layers": ["Puma concolor"]
        },
        "range": {
            "names": ["Puma concolor","Puma yagouaroundi", "Smilisca puma"],
            "sources": ["MOL"],
            "layers": ["Puma concolor","Puma yagouaroundi", "Smilisca puma"]
        }        
    },
    
    "sources": {
        "GBIF": {
            "names": ["Puma concolor"],
            "types": ["points"],
            "layers": ["Puma concolor"]
        },        
        "MOL": {
            "names": ["Puma concolor", "Puma yagouaroundi", "Smilisca puma"],
            "types": ["range"],
            "layers": ["Puma concolor", "Puma yagouaroundi", "Smilisca puma"]
        }
    },

    "names": {
        "Puma concolor": {
            "sources": ["GBIF", "MOL"],
            "layers": ["Puma concolor", "Puma yagouaroundi", "Smilisca puma"],
            "types": ["points", "range"]
        },
        "Puma yagouaroundi": {
            "sources": ["MOL"],
            "layers": ["Puma yagouaroundi"],
            "types": ["range"]            
        },    
        "Puma Smilisca": {
            "sources": ["MOL"],
            "layers": ["Smilisca puma"],
            "types": ["range"]
        }
    },

    "layers": {
        "Puma concolor": {
            source: "GBIF",
            "type": "points",
            "otherStuff": "blah blah"
        },                
        "Puma yagouaroundi": {
            source: "MOL",
            "type": "range",
            "otherStuff": "blah blah"
        },       
        "Puma Smilisca": {
            source: "MOL",
            "type": "range",
            "otherStuff": "blah blah"
        }    
    }
}
