-- Stores insurance provider and policy plan details used for coverage calculations
CREATE TABLE IF NOT EXISTS insurance_policy_details (
    policy_id      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    provider_name  VARCHAR(100) NOT NULL, --  provider name (e.g., 'Ceylinco Life', 'Softlogic Life')
    policy_name    VARCHAR(100) NOT NULL  -- Policy plan name (e.g., 'Gold Health Plan', 'Executive Health')
);
