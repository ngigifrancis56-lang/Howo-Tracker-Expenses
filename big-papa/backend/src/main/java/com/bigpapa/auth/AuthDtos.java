package com.bigpapa.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class AuthDtos {
    private AuthDtos() {}
    public record RegisterRequest(@NotBlank @Size(max=120) String fullName,
                                  @NotBlank @Email @Size(max=190) String email,
                                  @NotBlank @Size(min=10, max=72) String password) {}
    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {}
    public record UserView(Long id, String fullName, String email, String role) {}
    public record AuthResponse(String token, UserView user) {}
}
