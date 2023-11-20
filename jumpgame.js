import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene,
} = tiny;

let TIMESTEP = 0.25;
const GRAVITY_VECTOR = vec3(0,1,0);

class Player {
    // "pos" is the location of the center of the bottom face of the player
    constructor(pos) {
        this.pos = pos;
        this.vel = vec3(0,0,0);
        this.shape = new defs.Cube();
        this.material = new Material(new defs.Phong_Shader(),
            {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")});
        this.falling = false;
        this.time=0;
    }

    draw(context, program_state) {
        let player_transform = Mat4.translation(0,1,0).times(Mat4.translation(...this.pos));
        this.shape.draw(context, program_state, player_transform, this.material);
    }

    // v is the vector to direct the jump
    jump(done) {
        if (this.falling) return;
        this.time++;
        if(!done) return;
        this.vel = this.vel.plus(vec3(Math.min(2,1.15*this.time/4),Math.min(3,2*this.time/4),0));
        this.time=0;

        this.falling = true;
    }

    // Updates position and velocity if currently falling
    update() {
        if (!this.falling) return;
        this.pos = this.pos.plus(this.vel.times(TIMESTEP));
        this.vel = this.vel.minus(GRAVITY_VECTOR.times(TIMESTEP));
    }

    // Land and adjust y-level to y
    land(y) {
        this.falling = false;
        this.pos[1] = y;
        this.vel = vec3(0,0,0);
    }
}

class Tree {
    // "pos" is the location of the center of the bottom face of the tree
    constructor(pos, radius, height) {
        this.pos = pos;
        this.radius = radius;
        this.height = height;
        this.shape = new defs.Capped_Cylinder(30, 30);
        this.material = new Material(new defs.Phong_Shader(),
            {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")});
    }

    draw(context, program_state) {
        let tree_transform = Mat4.scale(this.radius,this.height,this.radius).times(Mat4.translation(0,0.5,0).times(Mat4.rotation(Math.PI/2,1,0,0)));
        tree_transform.pre_multiply(Mat4.translation(...this.pos));
        //let tree_transform = Mat4.scale(this.radius,this.height,this.radius).times(Mat4.translation(0,0.5,0).times(Mat4.translation(...this.pos).times(Mat4.rotation(Math.PI/2,1,0,0))));
        this.shape.draw(context, program_state, tree_transform, this.material);
    }
}

export class JumpGame extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            torus: new defs.Torus(15, 15),
            torus2: new defs.Torus(3, 15),
            sphere: new defs.Subdivision_Sphere(4), circle: new defs.Regular_2D_Polygon(1, 15),
            // TODO:  Fill in as many additional shape instances as needed in this key/value table.
            //        (Requirement 1)
        };

        // *** Materials
        this.materials = {
            test: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),
            test2: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#992828")}),
            ring: new Material(new defs.Phong_Shader()),
            // TODO:  Fill in as many additional material objects as needed in this key/value table.
            //        (Requirement 4)
        }

        this.initial_camera_location = Mat4.look_at(vec3(0, 10, 20), vec3(0, 0, 0), vec3(0, 1, 0));

        this.gameOver=false;

        this.onBlock=false;

        // Game initialization
        this.player = new Player(vec3(0,1,0));
        this.trees = [new Tree(vec3(0,0,0),1,1), new Tree(vec3(5,0,0),1.5,1), new Tree(vec3(10,0,0),1.5,1), new Tree(vec3(15,0,0),1.5,1), new Tree(vec3(20,0,0),1,2)];
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        /*this.key_triggered_button("View solar system", ["Control", "0"], () => this.attached = () => null);
        this.new_line();
        this.key_triggered_button("Attach to planet 1", ["Control", "1"], () => this.attached = () => this.planet_1);
        this.key_triggered_button("Attach to planet 2", ["Control", "2"], () => this.attached = () => this.planet_2);
        this.new_line();
        this.key_triggered_button("Attach to planet 3", ["Control", "3"], () => this.attached = () => this.planet_3);
        this.key_triggered_button("Attach to planet 4", ["Control", "4"], () => this.attached = () => this.planet_4);
        this.new_line();
        this.key_triggered_button("Attach to moon", ["Control", "m"], () => this.attached = () => this.moon);*/
        this.key_triggered_button("Jump(distance proportional to duration of key press" +
            "", ["j"], () => this.player.jump(false),
            "hi", () => this.player.jump(true));
    }

    display(context, program_state) {

        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);

        // TODO: Create Planets (Requirement 1)
        // this.shapes.[XXX].draw([XXX]) // <--example

        // TODO: Lighting (Requirement 2)
        const light_position = vec4(0, 5, 5, 1);
        // The parameters of the Light are: position, color, size
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000)];

        // TODO:  Fill in matrix operations and drawing code to draw the solar system scene (Requirements 3 and 4)
        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        TIMESTEP = program_state.animation_delta_time / 100;
        const yellow = hex_color("#fac91a");

        //this.shapes.torus.draw(context, program_state, model_transform, this.materials.test.override({color: yellow}));
        /*let tree_transform = Mat4.rotation(Math.PI/2, 1, 0, 0);
        for (let i = 0; i<5; i++) {
            this.shapes.cylinder.draw(context, program_state, tree_transform, this.materials.test);
            tree_transform.pre_multiply(Mat4.translation(5,0,0));
        }*/
        for (let tree of this.trees)
            tree.draw(context, program_state);

        if(this.gameOver) {
            this.player.draw(context, program_state);
            return;
        }

        this.player.update();
        //if y coord<=1(height of blocks), then check if above a block, if yes stop, if not keep going
        //if not above a block fail end game

        if (this.player.pos[1] <= 1) { //simply check if x-coord falls within that range
            this.onBlock=false;
            for (let tree of this.trees)
                if(tree.pos[0]-1<=this.player.pos[0]&&tree.pos[0]+1>=this.player.pos[0]){
                    this.onBlock=true;
                }
            if(this.onBlock==true) {
                this.player.land(1);
            }
        }
        if(this.player.pos[1]<=0){
            this.gameOver=true;
        }
        this.player.draw(context, program_state);
    }
}
