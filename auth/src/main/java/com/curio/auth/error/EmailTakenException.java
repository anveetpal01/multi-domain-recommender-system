package com.curio.auth.error;

public class EmailTakenException extends RuntimeException {
    public EmailTakenException() {
        super("Email already registered");
    }
}