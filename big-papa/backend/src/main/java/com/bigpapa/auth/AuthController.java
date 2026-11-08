package com.bigpapa.auth;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class AuthController {
    private final AuthService auth;
    public AuthController(AuthService auth) { this.auth=auth; }
    @GetMapping("/health") public java.util.Map<String,String> health() { return java.util.Map.of("status","ok","application","Big Papa API"); }
    @PostMapping("/auth/register") @ResponseStatus(HttpStatus.CREATED)
    public AuthDtos.AuthResponse register(@Valid @RequestBody AuthDtos.RegisterRequest req) { return auth.register(req); }
    @PostMapping("/auth/login")
    public AuthDtos.AuthResponse login(@Valid @RequestBody AuthDtos.LoginRequest req) { return auth.login(req); }
    @GetMapping("/auth/me") public AuthDtos.UserView me(Authentication authentication) { return auth.current(authentication.getName()); }
    @GetMapping("/admin/check") @PreAuthorize("hasRole('ADMIN')")
    public java.util.Map<String,String> adminCheck() { return java.util.Map.of("access","admin"); }
}
