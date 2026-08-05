// BSS wall terminal enclosure — PARAMETRIC ENGINEERING PROTOTYPE
// Units: millimetres. This is a dimension-controlled model, not a production release.
// Set measured values below, render (F6), then export STL. SolidWorks can import STL
// for reference; the production model must be rebuilt as native SLDPRT/SLDASM.

$fn = 72;

// ---- CONTROLLED INPUTS (replace only from measured hardware) ----
outer_w = 190;
outer_h = 125;
outer_d = 48;
wall = 2.8;
corner_r = 12;
front_lip = 2.0;

screen_visible_w = 96;   // HOLD: confirm exact Nextion model
screen_visible_h = 54;
screen_cutout_clearance = 0.6;
screen_center_x = 0;
screen_center_z = 14;

rfid_w = 46;             // antenna keep-out / presentation zone
rfid_h = 46;
rfid_center_x = 55;
rfid_center_z = -23;

pi_board_w = 85;
pi_board_h = 56;
pi_mount_spacing_x = 58;
pi_mount_spacing_y = 49;
pi_standoff_h = 7;
pi_hole_d = 2.8;

rear_mount_spacing_x = 120;
rear_mount_spacing_z = 68;
rear_mount_d = 4.5;
vent_slot_w = 20;
vent_slot_h = 2.2;
vent_count = 6;

cable_entry_w = 20;
cable_entry_h = 12;

module rounded_box(w,h,d,r){
  minkowski(){
    cube([w-2*r,d-2*r,h-2*r],center=true);
    sphere(r=r);
  }
}

module shell(){
  difference(){
    rounded_box(outer_w,outer_h,outer_d,corner_r);
    translate([0,-wall,0])
      rounded_box(outer_w-2*wall,outer_h-2*wall,outer_d,corner_r-wall);
  }
}

module front_cutouts(){
  // screen window
  translate([screen_center_x,-outer_d/2-1,screen_center_z])
    cube([screen_visible_w+2*screen_cutout_clearance,10,
          screen_visible_h+2*screen_cutout_clearance],center=true);
  // recessed RFID presentation zone (not a through-hole)
  translate([rfid_center_x,-outer_d/2-0.8,rfid_center_z])
    cube([rfid_w,1.5,rfid_h],center=true);
}

module rear_features(){
  // wall mounting holes
  for(x=[-rear_mount_spacing_x/2,rear_mount_spacing_x/2])
    for(z=[-rear_mount_spacing_z/2,rear_mount_spacing_z/2])
      translate([x,outer_d/2-2,z]) rotate([90,0,0])
        cylinder(h=10,d=rear_mount_d,center=true);
  // lower cable entry
  translate([0,outer_d/2-1,-outer_h/2+12])
    cube([cable_entry_w,10,cable_entry_h],center=true);
}

module vents(){
  for(i=[0:vent_count-1])
    translate([-outer_w/2+28+i*(vent_slot_w+4),0,outer_h/2-4])
      cube([vent_slot_w,outer_d+4,vent_slot_h],center=true);
}

module pi_standoffs(){
  for(x=[-pi_mount_spacing_x/2,pi_mount_spacing_x/2])
    for(z=[-pi_mount_spacing_y/2,pi_mount_spacing_y/2])
      translate([x,outer_d/2-wall-pi_standoff_h/2,z])
        difference(){
          cylinder(h=pi_standoff_h,d=7,center=true);
          cylinder(h=pi_standoff_h+1,d=pi_hole_d,center=true);
        }
}

module enclosure(){
  difference(){
    shell();
    front_cutouts();
    rear_features();
    vents();
  }
  pi_standoffs();
}

enclosure();
