CREATE TABLE queue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booth_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  visitor_name TEXT,
  visitor_phone TEXT,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'done', 'cancelled')),
  position INT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  called_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_queue_booth_status ON queue_entries(booth_id, status);
CREATE INDEX idx_queue_joined ON queue_entries(joined_at);

CREATE TABLE scan_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT,
  booth_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scan_booth ON scan_events(booth_id);
CREATE INDEX idx_scan_time ON scan_events(scanned_at);
