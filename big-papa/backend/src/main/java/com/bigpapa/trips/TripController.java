package com.bigpapa.trips;

import com.bigpapa.fleet.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/trips")
public class TripController {
    private final TripRepository trips;
    private final VehicleRepository vehicles;
    private final DriverRepository drivers;
    public TripController(TripRepository trips,VehicleRepository vehicles,DriverRepository drivers){this.trips=trips;this.vehicles=vehicles;this.drivers=drivers;}

    @GetMapping public List<Trip> list(@RequestParam(required=false) LocalDate from,@RequestParam(required=false) LocalDate to){
        if(from!=null&&to!=null){if(to.isBefore(from))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"End date must be on or after start date.");return trips.findByTripDateBetweenOrderByTripDateDesc(from,to);}
        return trips.findAllByOrderByTripDateDescCreatedAtDesc();
    }
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED) public Trip create(@Valid @RequestBody TripRequest req){if(req.clientRequestId()!=null){var existing=trips.findByClientRequestId(req.clientRequestId());if(existing.isPresent())return existing.get();}Trip t=new Trip();t.setClientRequestId(req.clientRequestId());return save(t,req);}
    @PutMapping("/{id}") @PreAuthorize("hasRole('ADMIN')")
    public Trip update(@PathVariable UUID id,@Valid @RequestBody TripRequest req){Trip t=trips.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Trip not found."));return save(t,req);}
    @DeleteMapping("/{id}") @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable UUID id){trips.delete(trips.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Trip not found.")));}

    private Trip save(Trip t,TripRequest r){
        Vehicle v=vehicles.findById(r.vehicleId()).orElseThrow(()->new ResponseStatusException(HttpStatus.BAD_REQUEST,"Selected vehicle was not found."));
        Driver d=drivers.findById(r.driverId()).orElseThrow(()->new ResponseStatusException(HttpStatus.BAD_REQUEST,"Selected driver was not found."));
        if(!"ACTIVE".equals(v.getStatus()))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Only active vehicles can be assigned to a trip.");
        if(!"ACTIVE".equals(d.getStatus()))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Only active drivers can be assigned to a trip.");
        if(r.driverAdvance().add(r.driverDeduction()).compareTo(r.driverPay())>0)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Driver advances and deductions cannot exceed the trip driver pay.");
        t.setTripDate(r.tripDate());t.setVehicleId(v.getId());t.setVehicleRegistration(v.getRegistrationNumber());t.setDriverId(d.getId());t.setDriverName(d.getFullName());
        t.setCargoType(r.cargoType());t.setOrigin(r.origin());t.setDestination(r.destination());t.setIncome(r.income());t.setFuelExpense(r.fuelExpense());t.setOtherExpenses(r.otherExpenses());t.setDriverPay(r.driverPay());t.setDriverAdvance(r.driverAdvance());t.setDriverDeduction(r.driverDeduction());t.setNotes(r.notes());
        return trips.save(t);
    }
}
