package com.bigpapa.config;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<Map<String,String>> status(ResponseStatusException e){
        return ResponseEntity.status(e.getStatusCode()).body(Map.of("message",e.getReason()==null?"Request failed":e.getReason()));
    }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Map<String,String>> validation(MethodArgumentNotValidException e){
        String message=e.getBindingResult().getFieldErrors().stream().findFirst().map(x->x.getField()+": "+x.getDefaultMessage()).orElse("Invalid request");
        return ResponseEntity.badRequest().body(Map.of("message",message));
    }
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<Map<String,String>> duplicate(DataIntegrityViolationException e){
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message","A record with one of these unique details already exists."));
    }
}
