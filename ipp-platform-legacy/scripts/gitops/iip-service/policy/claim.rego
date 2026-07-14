package main

# Deny claims missing a namespace
deny[msg] {
    not input.metadata.namespace
    msg := "Claim must have metadata.namespace set"
}

# Deny claims missing an owner label
deny[msg] {
    not input.metadata.labels["owner"]
    msg := "Claim must have metadata.labels.owner set"
}

# Deny claims targeting an unknown environment
deny[msg] {
    env := input.metadata.labels["environment"]
    not _valid_env(env)
    msg := sprintf("Unknown environment '%v'. Must be one of: dev, staging, prod", [env])
}

_valid_env("dev")
_valid_env("staging")
_valid_env("prod")
