import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { CommonService } from 'app/_services';
import { CommonUtils } from 'app/_helpers';

@Component({
  selector: 'app-room-calender-madal',
  templateUrl: './room-calender-madal.component.html',
  styleUrls: ['./room-calender-madal.component.scss']
})
export class RoomCalenderMadalComponent implements OnInit {

  public eventInfo: any={};
  public showArrival: boolean =false;
  public eventSettings: any={};
  public defaultDateTimeFormat: any = {date_format:'MM/dd/yyyy',time_format:"h:mm a"};
  constructor(
    public dialogRef: MatDialogRef<RoomCalenderMadalComponent>,
    private _commonService        : CommonService,
    private router: Router
  ) {
    //CLOSE MODAL WINDOW WHEN USER CLICK ON LINKED BUTTON FROM REGISTER COMPONENT
    router.events.subscribe((val) => {
       this.dialogRef.close();
    });
    
  }
 
  ngOnInit() {
    //Deault DateTime Formats
    console.log(this.eventInfo.event);
    this.defaultDateTimeFormat = this._commonService.getDefaultDateTimeFormat;
     
  }
  getLocationColors(categoryInfo:any,type:string='font_color'){
    if(categoryInfo && categoryInfo.categories &&  type=='font_color'){
      return categoryInfo.categories.font_color || '';
    }
    if(categoryInfo && categoryInfo.categories && type=='bg_color'){
      return categoryInfo.categories.bg_color || '';
    }
    return '';
  }

}
