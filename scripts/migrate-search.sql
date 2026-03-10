-- Maven Intelligent Search Migration
-- Run each block separately in Supabase SQL Editor

-- ============================================================
-- 1A. Enable extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- 1B. Add columns + immutable tsvector helper
-- ============================================================
CREATE OR REPLACE FUNCTION immutable_to_tsvector(text)
RETURNS tsvector AS $$
    SELECT to_tsvector('english', $1)
$$ LANGUAGE sql IMMUTABLE;

ALTER TABLE makers ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE makers ADD COLUMN IF NOT EXISTS embedding vector(384);
ALTER TABLE makers ADD COLUMN IF NOT EXISTS search_text tsvector
    GENERATED ALWAYS AS (
        setweight(immutable_to_tsvector(coalesce(name, '')), 'A') ||
        setweight(immutable_to_tsvector(coalesce(category, '')), 'A') ||
        setweight(immutable_to_tsvector(coalesce(city, '')), 'B') ||
        setweight(immutable_to_tsvector(coalesce(county, '')), 'B') ||
        setweight(immutable_to_tsvector(coalesce(bio, '')), 'C') ||
        setweight(immutable_to_tsvector(coalesce(array_to_string(tags, ' '), '')), 'B')
    ) STORED;

-- ============================================================
-- 1C. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_makers_search_text ON makers USING gin(search_text);
CREATE INDEX IF NOT EXISTS idx_makers_name_trgm ON makers USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_makers_bio_trgm ON makers USING gin(bio gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_makers_category_trgm ON makers USING gin(category gin_trgm_ops);

-- ============================================================
-- 1D. Synonym table
-- ============================================================
CREATE TABLE IF NOT EXISTS search_synonyms (
    term text PRIMARY KEY,
    synonyms text[] NOT NULL
);

INSERT INTO search_synonyms (term, synonyms) VALUES
    ('jewelry',    ARRAY['jewellery', 'jeweler', 'rings', 'necklaces', 'bracelets', 'earrings', 'silver', 'gold']),
    ('jewellery',  ARRAY['jewelry', 'jeweler', 'rings', 'necklaces', 'bracelets', 'earrings', 'silver', 'gold']),
    ('pottery',    ARRAY['ceramics', 'stoneware', 'earthenware', 'clay', 'kiln', 'thrown', 'glazed']),
    ('ceramics',   ARRAY['pottery', 'stoneware', 'earthenware', 'clay', 'kiln', 'thrown', 'glazed']),
    ('clothes',    ARRAY['fashion', 'garments', 'clothing', 'wearable', 'textiles', 'fabric', 'linen']),
    ('fashion',    ARRAY['clothes', 'garments', 'clothing', 'wearable', 'textiles', 'fabric']),
    ('gifts',      ARRAY['presents', 'gift', 'birthday', 'christmas', 'handmade', 'unique']),
    ('prints',     ARRAY['print', 'printing', 'screenprint', 'letterpress', 'risograph', 'poster', 'art']),
    ('woodwork',   ARRAY['wood', 'woodturning', 'furniture', 'timber', 'carpentry', 'carving']),
    ('homeware',   ARRAY['home', 'interiors', 'decor', 'furnishings', 'textiles', 'candles', 'throws']),
    ('weaving',    ARRAY['woven', 'loom', 'tweed', 'textiles', 'fabric', 'wool']),
    ('knitting',   ARRAY['knit', 'knitwear', 'wool', 'yarn', 'handknit']),
    ('glass',      ARRAY['glassblowing', 'stained glass', 'fused glass', 'blown glass']),
    ('leather',    ARRAY['leatherwork', 'leathercraft', 'bags', 'belts', 'wallets']),
    ('candles',    ARRAY['candlemaking', 'wax', 'scented', 'soy candle', 'homeware']),
    ('art',        ARRAY['painting', 'illustration', 'drawing', 'artist', 'artwork', 'gallery']),
    ('soap',       ARRAY['skincare', 'handmade soap', 'natural', 'bath', 'body'])
ON CONFLICT (term) DO NOTHING;

-- ============================================================
-- 1E. Search RPC (matches your exact schema)
-- ============================================================
DROP FUNCTION IF EXISTS search_makers(text, double precision, double precision, int);

CREATE OR REPLACE FUNCTION search_makers(
    search_query text,
    user_lat double precision DEFAULT NULL,
    user_lng double precision DEFAULT NULL,
    match_limit int DEFAULT 20
)
RETURNS TABLE (
    id text,
    search_rank real,
    search_method text
) AS $$
DECLARE
    expanded_query text;
    synonym_terms text[];
BEGIN
    expanded_query := search_query;

    -- Fuzzy synonym lookup: typos like "jewlry" match "jewelry"/"jewellery"
    SELECT array_agg(DISTINCT s)
    INTO synonym_terms
    FROM search_synonyms, unnest(synonyms) AS s
    WHERE search_synonyms.term = lower(search_query)
       OR search_synonyms.term = ANY(string_to_array(lower(search_query), ' '))
       OR similarity(search_synonyms.term, lower(search_query)) > 0.3;

    IF synonym_terms IS NOT NULL THEN
        expanded_query := search_query || ' ' || array_to_string(synonym_terms, ' ');
    END IF;

    -- Full-text search with synonym expansion
    RETURN QUERY
    SELECT
        m.id,
        ts_rank_cd(m.search_text, websearch_to_tsquery('english', expanded_query))::real AS search_rank,
        'fulltext'::text AS search_method
    FROM makers m
    WHERE m.search_text @@ websearch_to_tsquery('english', expanded_query)
    ORDER BY search_rank DESC
    LIMIT match_limit;

    IF FOUND THEN RETURN; END IF;

    -- Fallback: trigram fuzzy matching (handles typos)
    RETURN QUERY
    SELECT
        m.id,
        GREATEST(
            similarity(m.name, search_query),
            similarity(m.category, search_query),
            similarity(m.city, search_query) * 0.8,
            similarity(m.bio, search_query) * 0.5
        )::real AS search_rank,
        'fuzzy'::text AS search_method
    FROM makers m
    WHERE similarity(m.name, search_query) > 0.15
       OR similarity(m.category, search_query) > 0.25
       OR similarity(m.city, search_query) > 0.3
       OR similarity(m.bio, search_query) > 0.1
    ORDER BY search_rank DESC
    LIMIT match_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION search_makers TO anon, authenticated;

-- ============================================================
-- 1F. Seed category tags
-- ============================================================
UPDATE makers SET tags = ARRAY['ceramics', 'pottery', 'stoneware', 'handmade', 'gifts', 'homeware', 'clay', 'kiln']
WHERE lower(category) = 'objects' AND (lower(name) LIKE '%ceramic%' OR lower(name) LIKE '%clay%' OR lower(name) LIKE '%potter%');

UPDATE makers SET tags = ARRAY['jewellery', 'silver', 'gold', 'rings', 'necklaces', 'handcrafted', 'gifts', 'wearable']
WHERE lower(category) = 'objects' AND (lower(name) LIKE '%silver%' OR lower(name) LIKE '%jewel%' OR lower(name) LIKE '%gold%');

UPDATE makers SET tags = ARRAY['handmade', 'craft', 'irish', 'artisan', 'gifts']
WHERE tags = '{}' AND lower(category) = 'objects';

UPDATE makers SET tags = ARRAY['fashion', 'clothing', 'textiles', 'handmade', 'sustainable', 'wearable']
WHERE lower(category) = 'clothing';

UPDATE makers SET tags = ARRAY['print', 'art', 'illustration', 'poster', 'gallery', 'creative']
WHERE lower(category) = 'art';
