package com.bigpapa.fleet;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name="drivers")
public class Driver {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @NotBlank @Column(nullable=false, length=120) private String fullName;
    @NotBlank @Column(nullable=false, length=30) private String phone;
    @NotBlank @Column(nullable=false, unique=true, length=50) private String licenceNumber;
    @NotBlank @Column(nullable=false, length=20) private String status = "ACTIVE";
    @Column(length=20) private String vehicleRegistration;
    @Column(nullable=false, updatable=false) private Instant createdAt = Instant.now();
    @Column(nullable=false) private Instant updatedAt = Instant.now();

    @PreUpdate void touch(){updatedAt=Instant.now();}
    public UUID getId(){return id;}
    public String getFullName(){return fullName;}
    public void setFullName(String v){fullName=v.trim();}
    public String getPhone(){return phone;}
    public void setPhone(String v){phone=v.trim();}
    public String getLicenceNumber(){return licenceNumber;}
    public void setLicenceNumber(String v){licenceNumber=v.trim().toUpperCase();}
    public String getStatus(){return status;}
    public void setStatus(String v){status=v.trim().toUpperCase();}
    public String getVehicleRegistration(){return vehicleRegistration;}
    public void setVehicleRegistration(String v){vehicleRegistration=v==null||v.isBlank()?null:v.trim().toUpperCase();}
    public Instant getCreatedAt(){return createdAt;}
    public Instant getUpdatedAt(){return updatedAt;}
}
