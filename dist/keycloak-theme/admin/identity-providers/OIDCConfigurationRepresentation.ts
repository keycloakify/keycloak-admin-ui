/* eslint-disable */

// @ts-nocheck

export interface OIDCConfigurationRepresentation {
  issuer?: string;
  authorization_endpoint?: string;
  token_endpoint?: string;
  introspection_endpoint?: string;
  userinfo_endpoint?: string;
  end_session_endpoint?: string;
  jwks_uri?: string;
  check_session_iframe?: string;
  grant_types_supported?: string[];
  response_types_supported?: string[];
  subject_types_supported?: string[];
  id_token_signing_alg_values_supported?: string[];
  id_token_encryption_alg_values_supported?: string[];
  id_token_encryption_enc_values_supported?: string[];
  userinfo_signing_alg_values_supported?: string[];
  request_object_signing_alg_values_supported?: string[];
  response_modes_supported?: string[];
  registration_endpoint?: string;
  token_endpoint_auth_methods_supported?: string[];
  token_endpoint_auth_signing_alg_values_supported?: string[];
  introspection_endpoint_auth_methods_supported?: string[];
  introspection_endpoint_auth_signing_alg_values_supported?: string[];
  claims_supported?: string[];
  claim_types_supported?: string[];
  claims_parameter_supported?: boolean;
  scopes_supported?: string[];
  request_parameter_supported?: boolean;
  request_uri_parameter_supported?: boolean;
  require_request_uri_registration?: boolean;
  code_challenge_methods_supported?: string[];
  tls_client_certificate_bound_access_tokens?: boolean;
  revocation_endpoint?: string;
  revocation_endpoint_auth_methods_supported?: string[];
  revocation_endpoint_auth_signing_alg_values_supported?: string[];
  backchannel_logout_supported?: boolean;
  backchannel_logout_session_supported?: boolean;
  device_authorization_endpoint?: string;
}
