package com.bigpapa.fleet;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name="vehicles", uniqueConstraints=@UniqueConstraint(name="uk_vehicle_registration", columnNames="registration_number"))
public class Vehicle {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @NotBlank @Column(name="registration_number", nullable=false, length=20) private String registrationNumber;
    @NotBlank @Column(nullable=false, length=60) private String make;
    @NotBlank @Column(nullable=false, length=80) private String model;
    @Min(1950) @Max(2100) private Integer year;
    @DecimalMin("0.1") private Double capacityTonnes;
    @NotBlank @Column(nullable=false, length=20) private String status = "ACTIVE";
    @Column(nullable=false, updatable=false) private Instant createdAt = Instant.now();
    @Column(nullable=false) private Instant updatedAt = Instant.now();

    @PreUpdate void touch(){ updatedAt=Instant.now(); }
    public UUID getId(){return id;}
    public String getRegistrationNumber(){return registrationNumber;}
    public void setRegistrationNumber(String v){registrationNumber=v.trim().toUpperCase();}
    public String getMake(){return make;}
    public void setMake(String v){make=v.trim();}
    public String getModel(){return model;}
    public void setModel(String v){model=v.trim();}
    public Integer getYear(){return year;}
    public void setYear(Integer v){year=v;}
    public Double getCapacityTonnes(){return capacityTonnes;}
    public void setCapacityTonnes(Double v){capacityTonnes=v;}
    public String getStatus(){return status;}
    public void setStatus(String v){status=v.trim().toUpperCase();}
    public Instant getCreatedAt(){return createdAt;}
    public Instant getUpdatedAt(){return updatedAt;}
}
