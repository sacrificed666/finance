-- Every table of Finance; the server applies this file on every start, so it only creates what is missing

-- One server at a time applies the schema, so two booting copies never race
SELECT pg_advisory_xact_lock(hashtext('finance-schema'));

-- People who can sign in; Auth.js reads name, email, emailVerified and image
CREATE TABLE IF NOT EXISTS users (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email           text UNIQUE,
    "emailVerified" timestamptz,
    -- Filled by Google sign-in only; the app keeps its own copy in profile_secret
    name            text,
    image           text,
    -- scrypt with its parameters, or NULL for an account without a password
    password_hash   text,
    -- Sealed name, avatar and the other profile fields
    profile_secret  text,
    -- Sealed authenticator secret and recovery-code hashes, NULL while it is off
    two_factor      text,
    -- Raised by "Sign out everywhere"; a session from an older epoch ends
    session_epoch   integer NOT NULL DEFAULT 0 CHECK (session_epoch >= 0),
    -- The sign-in that keeps its session when the epoch rises, as after a new password
    epoch_keeper    text,
    -- The last day the morning notification went out
    reminded_on     date,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- Sign-in providers linked to an account, such as Google, as Auth.js stores them
CREATE TABLE IF NOT EXISTS accounts (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId"            uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type                text NOT NULL,
    provider            text NOT NULL,
    "providerAccountId" text NOT NULL,
    refresh_token       text,
    access_token        text,
    expires_at          bigint,
    id_token            text,
    scope               text,
    session_state       text,
    token_type          text,
    UNIQUE (provider, "providerAccountId")
);

-- The provider links of one account, for the profile page
CREATE INDEX IF NOT EXISTS accounts_user_idx ON accounts ("userId");

-- Database sessions of Auth.js; the app signs in with JWTs, so this stays empty
CREATE TABLE IF NOT EXISTS sessions (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId"       uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    expires        timestamptz NOT NULL,
    "sessionToken" text NOT NULL UNIQUE
);

-- Email sign-in links of Auth.js; unused while there is no email provider
CREATE TABLE IF NOT EXISTS verification_token (
    identifier text NOT NULL,
    expires    timestamptz NOT NULL,
    token      text NOT NULL,
    PRIMARY KEY (identifier, token)
);

-- Each account's settings, sealed; its row is the lock and revision of every save
CREATE TABLE IF NOT EXISTS settings (
    user_id    uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    -- Plain, so the server can write in the account's language without opening anything
    locale     text,
    secret     text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Every record of an account's data, sealed: entries, accounts, budgets and the rest
CREATE TABLE IF NOT EXISTS records (
    user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    -- The collection of AppState it belongs to, such as transactions or debts
    collection text NOT NULL,
    id         text NOT NULL,
    secret     text NOT NULL,
    PRIMARY KEY (user_id, collection, id)
);

-- Receipt photos, sealed; the ones no entry refers to are pruned after a day
CREATE TABLE IF NOT EXISTS attachments (
    user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    id         text NOT NULL,
    mime       text NOT NULL CHECK (mime IN ('image/webp', 'image/jpeg', 'image/png')),
    secret     text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, id)
);

-- Connected banks with their sealed token, card list and webhook key
CREATE TABLE IF NOT EXISTS integrations (
    user_id      uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    provider     text NOT NULL CHECK (provider IN ('monobank')),
    secret       text NOT NULL,
    -- SHA-256 of the webhook key, so a call finds its account without opening every row
    webhook_hash text,
    updated_at   timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, provider)
);

-- The account a webhook call belongs to
CREATE INDEX IF NOT EXISTS integrations_webhook_idx ON integrations (webhook_hash);

-- Devices that get notifications, with their sealed push address and keys
CREATE TABLE IF NOT EXISTS push_subscriptions (
    user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    id         text NOT NULL,
    secret     text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, id)
);

-- Passkeys by credential id, with the public key and counter sealed
CREATE TABLE IF NOT EXISTS passkeys (
    id         text PRIMARY KEY,
    user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    secret     text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- The passkeys of one account
CREATE INDEX IF NOT EXISTS passkeys_user_idx ON passkeys (user_id);

-- Recent sign-ins with their method, device and address sealed; the latest 50 stay
CREATE TABLE IF NOT EXISTS sign_ins (
    id      bigserial PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    at      timestamptz NOT NULL DEFAULT now(),
    secret  text NOT NULL
);

-- The newest sign-ins of one account first
CREATE INDEX IF NOT EXISTS sign_ins_user_idx ON sign_ins (user_id, at DESC);

-- Server failures for the owner's settings page, the latest 200; never a record
CREATE TABLE IF NOT EXISTS app_errors (
    id      bigserial PRIMARY KEY,
    at      timestamptz NOT NULL DEFAULT now(),
    route   text NOT NULL,
    message text NOT NULL,
    digest  text
);
