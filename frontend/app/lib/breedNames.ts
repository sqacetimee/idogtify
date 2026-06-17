/**
 * Maps the exact model class names (from Stanford Dogs) to nicer display
 * labels and common nicknames shown in the UI.
 *
 * label  — what to show as the primary breed name (fixes Stanford's odd names)
 * nick   — the informal / everyday name people actually use
 */
type BreedInfo = { label: string; nick?: string };

const BREED_MAP: Record<string, BreedInfo> = {
  // ── Fix Stanford Dogs' non-standard class names ────────────────────────────
  "Scotch Terrier":               { label: "Scottish Terrier",              nick: "Scottie"       },
  "Boston Bull":                  { label: "Boston Terrier",                nick: "Boston"        },
  "Lhasa":                        { label: "Lhasa Apso"                                           },
  "Blenheim Spaniel":             { label: "Cavalier King Charles Spaniel", nick: "Cavalier"      },
  "Japanese Spaniel":             { label: "Japanese Chin",                 nick: "Chin"          },
  "Maltese Dog":                  { label: "Maltese"                                              },
  "Mexican Hairless":             { label: "Xoloitzcuintli",               nick: "Xolo"          },
  "Eskimo Dog":                   { label: "American Eskimo Dog",           nick: "Eskie"         },
  "Pekinese":                     { label: "Pekingese",                     nick: "Peke"          },
  "Shih-Tzu":                     { label: "Shih Tzu"                                             },
  "Malamute":                     { label: "Alaskan Malamute",              nick: "Mal"           },
  "Airedale":                     { label: "Airedale Terrier",              nick: "King of Terriers" },
  "Bluetick":                     { label: "Bluetick Coonhound"                                   },
  "Redbone":                      { label: "Redbone Coonhound"                                    },
  "Walker Hound":                 { label: "Treeing Walker Coonhound"                             },
  "Basset":                       { label: "Basset Hound"                                         },
  "Cairn":                        { label: "Cairn Terrier"                                        },
  "Leonberg":                     { label: "Leonberger",                    nick: "Leo"           },
  "Groenendael":                  { label: "Belgian Sheepdog"                                     },
  "Malinois":                     { label: "Belgian Malinois",              nick: "Mali"          },
  "Chow":                         { label: "Chow Chow"                                            },
  "Pembroke":                     { label: "Pembroke Welsh Corgi",          nick: "Corgi"         },
  "Cardigan":                     { label: "Cardigan Welsh Corgi",          nick: "Corgi"         },
  "Brabancon Griffon":            { label: "Brussels Griffon",              nick: "Griff"         },
  "EntleBucher":                  { label: "Entlebucher Mountain Dog"                             },
  "Kelpie":                       { label: "Australian Kelpie"                                    },
  "Doberman":                     { label: "Dobermann",                     nick: "Dobie"         },
  "Staffordshire Bullterrier":    { label: "Staffordshire Bull Terrier",    nick: "Staffy"        },
  "Bull Mastiff":                 { label: "Bullmastiff"                                          },
  "Clumber":                      { label: "Clumber Spaniel"                                      },
  "English Springer":             { label: "English Springer Spaniel",      nick: "Springer"      },
  "Toy Terrier":                  { label: "English Toy Terrier"                                  },
  "Black-And-Tan Coonhound":      { label: "Black and Tan Coonhound"                              },
  "Bouvier Des Flandres":         { label: "Bouvier des Flandres",          nick: "Bouvier"       },
  "Wire-Haired Fox Terrier":      { label: "Wire Fox Terrier"                                     },
  "Soft-Coated Wheaten Terrier":  { label: "Soft Coated Wheaten Terrier",   nick: "Wheaten"       },
  "Collie":                       { label: "Rough Collie",                  nick: "Lassie breed"  },
  "Scottish Deerhound":           { label: "Scottish Deerhound",            nick: "Deerhound"     },

  // ── Familiar nicknames for well-known breeds ───────────────────────────────
  "Yorkshire Terrier":            { label: "Yorkshire Terrier",             nick: "Yorkie"        },
  "French Bulldog":               { label: "French Bulldog",                nick: "Frenchie"      },
  "West Highland White Terrier":  { label: "West Highland White Terrier",   nick: "Westie"        },
  "Shetland Sheepdog":            { label: "Shetland Sheepdog",             nick: "Sheltie"       },
  "Pomeranian":                   { label: "Pomeranian",                    nick: "Pom"           },
  "Golden Retriever":             { label: "Golden Retriever",              nick: "Golden"        },
  "Labrador Retriever":           { label: "Labrador Retriever",            nick: "Lab"           },
  "German Shepherd":              { label: "German Shepherd",               nick: "GSD"           },
  "Siberian Husky":               { label: "Siberian Husky",                nick: "Husky"         },
  "Rottweiler":                   { label: "Rottweiler",                    nick: "Rottie"        },
  "Miniature Pinscher":           { label: "Miniature Pinscher",            nick: "Min Pin"       },
  "Bernese Mountain Dog":         { label: "Bernese Mountain Dog",          nick: "Berner"        },
  "Old English Sheepdog":         { label: "Old English Sheepdog",          nick: "Bobtail"       },
  "American Staffordshire Terrier": { label: "American Staffordshire Terrier", nick: "AmStaff"   },
  "Great Dane":                   { label: "Great Dane",                    nick: "Dane"          },
  "Saint Bernard":                { label: "Saint Bernard",                 nick: "Saint"         },
  "Samoyed":                      { label: "Samoyed",                       nick: "Sammy"         },
  "Newfoundland":                 { label: "Newfoundland",                  nick: "Newfie"        },
  "Border Collie":                { label: "Border Collie",                 nick: "BC"            },
  "Great Pyrenees":               { label: "Great Pyrenees",                nick: "Pyr"           },
  "Miniature Schnauzer":          { label: "Miniature Schnauzer",           nick: "Schnauzer"     },
  "Italian Greyhound":            { label: "Italian Greyhound",             nick: "IG"            },
  "Irish Setter":                 { label: "Irish Setter",                  nick: "Red Setter"    },
  "Irish Water Spaniel":          { label: "Irish Water Spaniel",           nick: "Bog Dog"       },
  "Cocker Spaniel":               { label: "Cocker Spaniel",                nick: "Cocker"        },
  "Affenpinscher":                { label: "Affenpinscher",                 nick: "Monkey Dog"    },
  "Keeshond":                     { label: "Keeshond",                      nick: "Dutch Barge Dog" },
  "Tibetan Mastiff":              { label: "Tibetan Mastiff",               nick: "TM"            },
  "Weimaraner":                   { label: "Weimaraner",                    nick: "Grey Ghost"    },
  "Vizsla":                       { label: "Vizsla",                        nick: "Hungarian Vizsla" },
  "German Short-Haired Pointer":  { label: "German Shorthaired Pointer",    nick: "GSP"           },
};

/** Primary display name — corrects Stanford Dogs' odd class names. */
export function getBreedLabel(modelName: string): string {
  return BREED_MAP[modelName]?.label ?? modelName;
}

/** Informal nickname people actually use, if one exists. */
export function getBreedNick(modelName: string): string | undefined {
  return BREED_MAP[modelName]?.nick;
}

/** All 120 Stanford Dogs breeds, sorted alphabetically by display name. */
export const ALL_BREEDS: Array<{ model: string; label: string; nick?: string }> = (
  [
    "Affenpinscher", "Afghan Hound", "African Hunting Dog", "Airedale",
    "American Staffordshire Terrier", "Appenzeller", "Australian Terrier",
    "Basenji", "Basset", "Beagle", "Bedlington Terrier", "Bernese Mountain Dog",
    "Blenheim Spaniel", "Bloodhound", "Bluetick", "Border Collie", "Border Terrier",
    "Borzoi", "Boston Bull", "Bouvier Des Flandres", "Boxer", "Brabancon Griffon",
    "Briard", "Brittany Spaniel", "Bull Mastiff", "Black-And-Tan Coonhound",
    "Cairn", "Cardigan", "Chesapeake Bay Retriever", "Chihuahua", "Chow",
    "Clumber", "Cocker Spaniel", "Collie", "Curly-Coated Retriever",
    "Dandie Dinmont", "Dhole", "Dingo", "Doberman",
    "English Foxhound", "English Setter", "English Springer", "EntleBucher",
    "Flat-Coated Retriever", "French Bulldog",
    "German Shepherd", "German Short-Haired Pointer", "Giant Schnauzer",
    "Gordon Setter", "Great Dane", "Great Pyrenees", "Greater Swiss Mountain Dog",
    "Groenendael",
    "Ibizan Hound", "Irish Setter", "Irish Terrier", "Irish Water Spaniel",
    "Irish Wolfhound", "Italian Greyhound",
    "Japanese Spaniel",
    "Keeshond", "Kelpie", "Kerry Blue Terrier", "Komondor", "Kuvasz",
    "Labrador Retriever", "Lakeland Terrier", "Leonberg", "Lhasa",
    "Malamute", "Malinois", "Maltese Dog", "Mexican Hairless",
    "Miniature Pinscher", "Miniature Poodle", "Miniature Schnauzer",
    "Newfoundland", "Norfolk Terrier", "Norwegian Elkhound", "Norwich Terrier",
    "Old English Sheepdog", "Otterhound",
    "Papillon", "Pekinese", "Pembroke", "Pomeranian", "Pug",
    "Redbone", "Rhodesian Ridgeback", "Rottweiler",
    "Saint Bernard", "Saluki", "Samoyed", "Schipperke", "Scotch Terrier",
    "Scottish Deerhound", "Sealyham Terrier", "Shetland Sheepdog",
    "Shih-Tzu", "Siberian Husky", "Silky Terrier", "Soft-Coated Wheaten Terrier",
    "Staffordshire Bullterrier", "Standard Poodle", "Standard Schnauzer",
    "Sussex Spaniel",
    "Tibetan Mastiff", "Tibetan Terrier", "Toy Poodle", "Toy Terrier",
    "Vizsla",
    "Walker Hound", "Weimaraner", "Welsh Springer Spaniel", "West Highland White Terrier",
    "Whippet", "Wire-Haired Fox Terrier",
    "Yorkshire Terrier",
  ] satisfies string[]
)
  .map((model) => ({
    model,
    label: BREED_MAP[model]?.label ?? model,
    nick: BREED_MAP[model]?.nick,
  }))
  .sort((a, b) => a.label.localeCompare(b.label));
