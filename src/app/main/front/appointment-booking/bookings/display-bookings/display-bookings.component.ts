import { Component, OnInit,Input,Output,EventEmitter,ViewChild } from '@angular/core';
import { AppointmentBookingService,ProfileService,UsersService,CommonService } from 'app/_services';
import { FormGroup, FormBuilder, Validators,FormArray } from '@angular/forms'
import { takeUntil, debounceTime, tap, switchMap } from 'rxjs/operators';
import { DiningGuestsComponent } from 'app/main/admin/appointment-booking/bookings/dining-guests/dining-guests.component';
import { Router } from '@angular/router';
import { CommonUtils } from 'app/_helpers';

@Component({
  selector: 'app-display-bookings',
  templateUrl: './display-bookings.component.html',
  styleUrls: ['./display-bookings.component.scss']
})
export class DisplayBookingsComponent implements OnInit {
  @Input() service_id;
  @Input() service_title;
  @Input() selected_date;
  @Input() service_image;
  @Input() displayFormData;
  @Input() service_desc;
  @Output() displayFrontBooking = new EventEmitter<boolean>(); 

  public addBookingForm : FormGroup;
  public getTimeSlots : any=[];
  filteredUsers: any[] = [];
  public partySize : any=[];
  public userMeta:any=[];
  public currentTimeSlot : any;
  public groupLimit: any[] = [];
  public serviceID : any;
  public selectedDate : any;
  public defaultImage : any;
  public sendUserId : any;
  public disableSubmit: boolean = false;
  public defaultDateTimeFormat: any = {date_format:'MM/dd/yyyy',time_format:"h:mm a"};
  public guestRequired : any;
  @ViewChild(DiningGuestsComponent,{static:true}) private guestsInfo: DiningGuestsComponent;


  constructor(private _appointmentService : AppointmentBookingService,
  private fb : FormBuilder,
  private _profileservices :ProfileService,
  private _userService     : UsersService,
  public  router 			     : Router,
  public _commonService    : CommonService) { }

  ngOnInit() {
        
    this.defaultImage = '/assets/images/backgrounds/diningReservation.jpg';
    this.setControls();
    this.timeSlots();
    this.addBookingForm
    .get('first_name').valueChanges
    .pipe(
      debounceTime(300),
      tap(),
      switchMap(value => this._userService.getUsers({'searchKey': value, autopopulate:1}))
    )
    .subscribe(users => this.filteredUsers = users.data);

    this._appointmentService.getGuestRestrictions({'meta_key':'guest_field_required'}).subscribe(response =>{
        this.guestRequired = response.settingsinfo.meta_value;
    });

    setTimeout(() => {
      this.getFormValues();
    }, 200);  //5s

    this.defaultDateTimeFormat = this._commonService.getDefaultDateTimeFormat;
    
  }

  


  setControls(){
    this.addBookingForm = this.fb.group({
      first_name   : this.fb.control('',[Validators.required]),
      email	       : this.fb.control('',[Validators.required,Validators.email]),
      address	     : this.fb.control(''),
      notes	       : this.fb.control(''),
      id	         : this.fb.control(''),
      guestcount   : this.fb.control(1),
      phone        : this.fb.control('',[Validators.required]), 
      guestsinfo    : [[]],
    });
    this._profileservices.getProfileInfo().subscribe(res=>{
      if(res.userinfo!='' && res.userinfo!=undefined){
        this.addBookingForm.patchValue({first_name:res.userinfo.first_name+' '+res.userinfo.last_name});
        this.addBookingForm.patchValue({email:res.userinfo.email});
        this.addBookingForm.patchValue({phone:res.userinfo.phone});
        this.addBookingForm.patchValue({id:res.userinfo.id});
        this.sendUserId = res.userinfo.id
        //Get UserMeta Fields To Print
        if(res.userinfo && res.userinfo.usermeta){
          this.userMeta = CommonUtils.getMetaValues(res.userinfo.usermeta);
          console.log("userMeta",this.userMeta);
          for(let i=0;i<this.userMeta.length;i++){
            if(this.userMeta[i].field_name == 'Apartment' || this.userMeta[i].field_name == 'unit_number' || this.userMeta[i].field_name == 'Home' || this.userMeta[i].field_name == 'address'){
                this.addBookingForm.patchValue({address:this.userMeta[i].field_value});
            }
          }
        }
      }
    });
    this.serviceID = this.service_id;
    
    this.selectedDate = this.selected_date;
  }  

  getFormValues(){
    let getData = this._appointmentService.getViewBookingData();
    if(getData!='' && getData!=undefined && this.displayFormData==true){
      
      this.addBookingForm.patchValue({first_name:getData.name});
      this.addBookingForm.patchValue({email:getData.email});
      this.addBookingForm.patchValue({address:getData.address});
      this.addBookingForm.patchValue({notes:getData.notes});
      this.addBookingForm.patchValue({guestsinfo:JSON.parse(getData.guestsinfo)});
      this.addBookingForm.patchValue({guestcount:getData.guestcount});
      this.addBookingForm.patchValue({phone:getData.phone});
      this.addBookingForm.patchValue({id:getData.user_id});
      this.service_title = getData.service_title;
      this.service_image = getData.service_image;
      this.serviceID = getData.service_id;
      this.selectedDate = getData.booking_start_date;
      this.timeSlots();
      this.getPartySizes(getData.booking_start_time);
      
    }
    
  }
  
  PhoneNumberValidations(event) {
    console.log(event.target.value[3]);
  
    if(event.target.value.length == 7){
    let values = event.target.value.replace(/\D/g, '').match(/(\d{3})(\d{4})/)
    console.log(values[2].length);
      event.target.value =  values[1] + '-' + values[2]
      this.addBookingForm.get('phone').setValue(event.target.value);
    }
    else{

     if(event.target.value.length == 10){
      let values = event.target.value.replace(/\D/g, '').match(/(\d{3})(\d{3})(\d{4})/)
      event.target.value =  values[1] + '-' + values[2] + '-' + values[3];
      this.addBookingForm.get('phone').setValue(event.target.value);
    }else{
          if((event.target.value[3] == '-' && event.target.value.length == 8) || (event.target.value[7]=='-' &&  event.target.value.length == 12)){
            this.addBookingForm.get('phone').setValue(event.target.value);
          }else{
            this.addBookingForm.get('phone').setValue('');
          }
       }
  }
  }
 
  timeSlots(){
    this._appointmentService.getTimeSlots({'service_id': this.serviceID,'date':this.selectedDate,'front':1}).subscribe(response =>{
      this.getTimeSlots = response.timeslot;
    });
    
  }


  getPartySizes(timeslot){
    this.currentTimeSlot = timeslot;
    //this.selectedBooking = 'selectedbooking';
    this._appointmentService.getPartySize({'service_id': this.serviceID,'date':this.selectedDate,'time':timeslot,'front':1}).subscribe(response =>{  
      this.partySize = [];
      for(var i=1;i<=response.partysize;i++){
        this.partySize.push(i);
      }
      let groupLimit = response.partysize || 0;
      this.groupLimit = Array.from(new Array(groupLimit),(val,index)=>index+1);
    });
  }

  
  resetGroupLimit(resetCount:number=1){
    this.addBookingForm.get('guestcount').setValue(resetCount);
   
  }
  /** Update Guest Info From Array */
  setguestInfoFieldValue($event:any){
    this.addBookingForm.get('guestsinfo').setValue($event);
    
  }

  //validate form from guest component
  validateParentForm($event){
    //this.disableSubmit = $event;
    if(this.guestRequired == 'Y'){
      this.disableSubmit = $event;
    }else{
      this.disableSubmit = false;
    }
  }

  setFormfields(userInfo:any){    
    if(userInfo.option.value){
      userInfo.option.value.user_id = userInfo.option.value.id || 0;
      this.addBookingForm.patchValue(userInfo.option.value);
    }
  } 

  getNextPreview(){
    let formValue = this.addBookingForm.value;
    
    let formData = {
      'name'                  : formValue.first_name,
      'email'                 : formValue.email,
      'phone'                 : formValue.phone,
      'service_id'            : this.serviceID,
      'notes'                 : formValue.notes,
      'booking_start_date'    : this.selectedDate,
      'booking_start_time'    : this.currentTimeSlot,
      'address'               : formValue.address,
      'attendee_type'         : 'M',
      'status'                : 'pending',
      'guestcount'            : formValue.guestcount,
      'guestsinfo'            : JSON.stringify(formValue.guestsinfo),
      'user_id'               : this.sendUserId,
      'id'                    : '',
      'update'                : '',
      'parent_booking_id'     : '',
      'front'                 : 1,
      'service_title'         : this.service_title,
      'service_image'         : this.service_image
    }
    if(this.addBookingForm.valid){
      this._appointmentService.setViewBookingData(formData);
      this.addBookingForm.patchValue(formValue);
      this.router.navigate(['view-fitness-reservations']);
    }
    
  }

  displayMainBooking(){
    this.router.navigate(['fitness-reservation']);
    this.displayFrontBooking.emit(false);
  }

}
