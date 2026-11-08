package com.bigpapa.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.util.Locale;

@Service
public class AuthService {
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final String adminEmail;
    public AuthService(UserRepository users, PasswordEncoder encoder, JwtService jwt,
                       @Value("${app.admin-email:}") String adminEmail) {
        this.users=users; this.encoder=encoder; this.jwt=jwt;
        this.adminEmail=adminEmail == null ? "" : adminEmail.trim().toLowerCase(Locale.ROOT);
    }
    public AuthDtos.AuthResponse register(AuthDtos.RegisterRequest req) {
        String email=req.email().trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmailIgnoreCase(email)) throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
        Role role = !adminEmail.isBlank() && adminEmail.equals(email) ? Role.ADMIN : Role.USER;
        AppUser user=users.save(new AppUser(req.fullName().trim(), email, encoder.encode(req.password()), role));
        return response(user);
    }
    public AuthDtos.AuthResponse login(AuthDtos.LoginRequest req) {
        AppUser user=users.findByEmailIgnoreCase(req.email().trim())
                .filter(u -> encoder.matches(req.password(), u.getPasswordHash()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));
        return response(user);
    }
    public AuthDtos.UserView current(String email) {
        AppUser u=users.findByEmailIgnoreCase(email).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return view(u);
    }
    private AuthDtos.AuthResponse response(AppUser u) { return new AuthDtos.AuthResponse(jwt.issue(u), view(u)); }
    private AuthDtos.UserView view(AppUser u) { return new AuthDtos.UserView(u.getId(),u.getFullName(),u.getEmail(),u.getRole().name()); }
}
