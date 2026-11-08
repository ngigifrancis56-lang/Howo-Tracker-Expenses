package com.bigpapa.trips;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name="trips")
public class Trip {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(unique=true) private UUID clientRequestId;
    @NotNull @Column(nullable=false) private LocalDate tripDate;
    @NotNull @Column(nullable=false) private UUID vehicleId;
    @NotBlank @Column(nullable=false,length=20) private String vehicleRegistration;
    @NotNull @Column(nullable=false) private UUID driverId;
    @NotBlank @Column(nullable=false,length=120) private String driverName;
    @NotBlank @Column(nullable=false,length=60) private String cargoType;
    @Column(length=120) private String origin;
    @Column(length=120) private String destination;
    @NotNull @DecimalMin("0.00") @Column(nullable=false,precision=14,scale=2) private BigDecimal income=BigDecimal.ZERO;
    @NotNull @DecimalMin("0.00") @Column(nullable=false,precision=14,scale=2) private BigDecimal fuelExpense=BigDecimal.ZERO;
    @NotNull @DecimalMin("0.00") @Column(nullable=false,precision=14,scale=2) private BigDecimal otherExpenses=BigDecimal.ZERO;
    @NotNull @DecimalMin("0.00") @Column(nullable=false,precision=14,scale=2) private BigDecimal driverPay=BigDecimal.ZERO;
    @NotNull @DecimalMin("0.00") @Column(nullable=false,precision=14,scale=2) private BigDecimal driverAdvance=BigDecimal.ZERO;
    @NotNull @DecimalMin("0.00") @Column(nullable=false,precision=14,scale=2) private BigDecimal driverDeduction=BigDecimal.ZERO;
    @Column(length=2000) private String notes;
    @Column(nullable=false,updatable=false) private Instant createdAt=Instant.now();
    @Column(nullable=false) private Instant updatedAt=Instant.now();

    @PreUpdate void touch(){updatedAt=Instant.now();}
    public BigDecimal getTotalExpenses(){return fuelExpense.add(otherExpenses);}
    public BigDecimal getProfit(){return income.subtract(getTotalExpenses()).subtract(driverPay);}
    public BigDecimal getDriverBalance(){return driverPay.subtract(driverAdvance).subtract(driverDeduction);}
    public UUID getId(){return id;}
    public UUID getClientRequestId(){return clientRequestId;} public void setClientRequestId(UUID v){clientRequestId=v;}
    public LocalDate getTripDate(){return tripDate;} public void setTripDate(LocalDate v){tripDate=v;}
    public UUID getVehicleId(){return vehicleId;} public void setVehicleId(UUID v){vehicleId=v;}
    public String getVehicleRegistration(){return vehicleRegistration;} public void setVehicleRegistration(String v){vehicleRegistration=v;}
    public UUID getDriverId(){return driverId;} public void setDriverId(UUID v){driverId=v;}
    public String getDriverName(){return driverName;} public void setDriverName(String v){driverName=v;}
    public String getCargoType(){return cargoType;} public void setCargoType(String v){cargoType=v.trim();}
    public String getOrigin(){return origin;} public void setOrigin(String v){origin=v;}
    public String getDestination(){return destination;} public void setDestination(String v){destination=v;}
    public BigDecimal getIncome(){return income;} public void setIncome(BigDecimal v){income=v;}
    public BigDecimal getFuelExpense(){return fuelExpense;} public void setFuelExpense(BigDecimal v){fuelExpense=v;}
    public BigDecimal getOtherExpenses(){return otherExpenses;} public void setOtherExpenses(BigDecimal v){otherExpenses=v;}
    public BigDecimal getDriverPay(){return driverPay;} public void setDriverPay(BigDecimal v){driverPay=v;}
    public BigDecimal getDriverAdvance(){return driverAdvance;} public void setDriverAdvance(BigDecimal v){driverAdvance=v;}
    public BigDecimal getDriverDeduction(){return driverDeduction;} public void setDriverDeduction(BigDecimal v){driverDeduction=v;}
    public String getNotes(){return notes;} public void setNotes(String v){notes=v;}
    public Instant getCreatedAt(){return createdAt;} public Instant getUpdatedAt(){return updatedAt;}
}
