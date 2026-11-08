package com.bigpapa.fleet;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class FleetController {
    private final VehicleRepository vehicles;
    private final DriverRepository drivers;
    public FleetController(VehicleRepository vehicles, DriverRepository drivers){this.vehicles=vehicles;this.drivers=drivers;}

    @GetMapping("/vehicles") public List<Vehicle> vehicles(){return vehicles.findAll();}
    @PostMapping("/vehicles") @PreAuthorize("hasRole('ADMIN')")
    public Vehicle addVehicle(@Valid @RequestBody Vehicle body){
        if(vehicles.existsByRegistrationNumberIgnoreCase(body.getRegistrationNumber()))
            throw new ResponseStatusException(HttpStatus.CONFLICT,"A vehicle with this registration already exists.");
        return vehicles.save(body);
    }
    @PutMapping("/vehicles/{id}") @PreAuthorize("hasRole('ADMIN')")
    public Vehicle updateVehicle(@PathVariable UUID id,@Valid @RequestBody Vehicle body){
        Vehicle v=vehicles.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
        if(!v.getRegistrationNumber().equalsIgnoreCase(body.getRegistrationNumber()) && vehicles.existsByRegistrationNumberIgnoreCase(body.getRegistrationNumber()))
            throw new ResponseStatusException(HttpStatus.CONFLICT,"A vehicle with this registration already exists.");
        v.setRegistrationNumber(body.getRegistrationNumber());v.setMake(body.getMake());v.setModel(body.getModel());v.setYear(body.getYear());v.setCapacityTonnes(body.getCapacityTonnes());v.setStatus(body.getStatus());
        return vehicles.save(v);
    }
    @DeleteMapping("/vehicles/{id}") @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT) public void deleteVehicle(@PathVariable UUID id){vehicles.delete(vehicles.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND)));}

    @GetMapping("/drivers") public List<Driver> drivers(){return drivers.findAll();}
    @PostMapping("/drivers") @PreAuthorize("hasRole('ADMIN')")
    public Driver addDriver(@Valid @RequestBody Driver body){
        if(drivers.existsByLicenceNumberIgnoreCase(body.getLicenceNumber()))
            throw new ResponseStatusException(HttpStatus.CONFLICT,"A driver with this licence number already exists.");
        return drivers.save(body);
    }
    @PutMapping("/drivers/{id}") @PreAuthorize("hasRole('ADMIN')")
    public Driver updateDriver(@PathVariable UUID id,@Valid @RequestBody Driver body){
        Driver d=drivers.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
        if(!d.getLicenceNumber().equalsIgnoreCase(body.getLicenceNumber()) && drivers.existsByLicenceNumberIgnoreCase(body.getLicenceNumber()))
            throw new ResponseStatusException(HttpStatus.CONFLICT,"A driver with this licence number already exists.");
        d.setFullName(body.getFullName());d.setPhone(body.getPhone());d.setLicenceNumber(body.getLicenceNumber());d.setStatus(body.getStatus());d.setVehicleRegistration(body.getVehicleRegistration());
        return drivers.save(d);
    }
    @DeleteMapping("/drivers/{id}") @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT) public void deleteDriver(@PathVariable UUID id){drivers.delete(drivers.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND)));}
}
