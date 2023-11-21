import {defs, tiny} from './examples/common.js';
import {Shape_From_File} from './examples/obj-file-demo.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture
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
        this.ifStarted = true;
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
    // "pos" is the location of the center of the bottom face of the Tree
    constructor(pos, radius, height) {
        this.pos = pos;
        this.radius = radius;
        this.height = height;
        this.shape = new defs.Capped_Cylinder(30, 30);

        this.material_gouraud = new Material(new Gouraud_Shader(),
        {ambient: 0, diffusivity: .8, specularity: 1, color: hex_color("#80FFFF")});

        this.material_phong = new Material(new defs.Phong_Shader(),
        {ambient: 0, diffusivity: .8, specularity: 1, color: hex_color("#80FFFF")});

        this.material_phong_shading = new Material(new defs.Phong_Shader(),
        {ambient: 0, diffusivity: .6, specularity: 1, color: hex_color("#80FFFF")});

    }

    draw(context, program_state, t, color, shading) {
        let tree_transform = Mat4.scale(this.radius,this.height,this.radius).times(Mat4.translation(0,0.5,0).times(Mat4.rotation(Math.PI/2,1,0,0)));
        tree_transform.pre_multiply(Mat4.translation(...this.pos));
        //let tree_transform = Mat4.scale(this.radius,this.height,this.radius).times(Mat4.translation(0,0.5,0).times(Mat4.translation(...this.pos).times(Mat4.rotation(Math.PI/2,1,0,0))));
        if(Math.floor(t)%2==0)
            this.shape.draw(context, program_state, tree_transform, this.material_gouraud.override({color:color}));
        else{
            if (shading)
                this.shape.draw(context, program_state, tree_transform, this.material_phong_shading.override({color:color}));
            else
                this.shape.draw(context, program_state, tree_transform, this.material_phong.override({color:color}));
        }
    }
}

class TreeBackground{
    constructor(pos, radius, height) {
        this.pos = pos;
        this.radius = radius;
        this.height = height;

        // Load the model file:
      this.shapes = {
        tree: new Shape_From_File("../assets/objects/Lowpoly_tree_sample.obj")
      };

      // Non bump mapped:
      this.tree = new Material(new defs.Phong_Shader(), {
          color: hex_color("#228B22"),
          ambient: .3, diffusivity: .5, specularity: .5,
      });
    }

    draw(context, program_state, t, color, shading) {
        let tree_transform = Mat4.scale(this.radius,this.height,this.radius).times(Mat4.translation(0,0.5,0));
        tree_transform.pre_multiply(Mat4.translation(...this.pos));
        this.shapes.tree.draw(context, program_state, tree_transform, this.tree);
    }
}


class Floor{
    constructor(pos, radius, height) {
        this.pos = pos;
        this.radius = radius;
        this.height = height;

        // Load the model file:
      this.shapes = {
        floor: new defs.Cube()
      };

      // Non bump mapped:
      this.floor = new Material(new defs.Textured_Phong(), {
        color: hex_color("#ffffff"),
        ambient: 0.5, diffusivity: 0.1, specularity: 0.1,
        texture: new Texture("../assets/grass.png")
        });
    }

    draw(context, program_state, t, color, shading) {
        let transform = Mat4.scale(30,0.1,15);
        transform.pre_multiply(Mat4.translation(...vec3(5,0,0)));
        this.shapes.floor.draw(context, program_state, transform, this.floor);
    }
}

export class JumpGame extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();        tree: new Shape_From_File("../assets/objects/Lowpoly_tree_sample.obj")


        // Colors
        this.colors = [];

        // *** Materials
        this.materials = {
            test: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),
            test2: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#992828")}),
            ring: new Material(new defs.Phong_Shader()),
        }

        this.gameOver=false;

        this.onBlock=false;

        this.initial_camera_location = Mat4.look_at(vec3(-6, 14, 6), vec3(3, 3, 0), vec3(0, 1, 0));
        // Game initialization
        this.player = new Player(vec3(0,1,0));
        this.trees = [new Tree(vec3(0,0,0),1,1), new Tree(vec3(5,0,0),1.5,1), new Tree(vec3(10,0,0),1.5,1), new Tree(vec3(15,0,0),1.5,1), new Tree(vec3(20,0,0),1,2)];
        this.tree_backgrounds = [
            new TreeBackground(vec3(-5,5,-3),3,3), 
            new TreeBackground(vec3(0,5,-3),3,3),
            new TreeBackground(vec3(5,5,-3),3,3),
            new TreeBackground(vec3(10,5,-3),3,3),          
            new TreeBackground(vec3(-5,0,9),3,3), 
            new TreeBackground(vec3(0,0,9),3,3),
            new TreeBackground(vec3(5,0,9),3,3),
            new TreeBackground(vec3(10,0,9),3,3),          
        ];
        this.floor = new Floor();
        this.set_colors();
    }

    set_colors() {
        // set color function
        // for (var i = 0; i < 8; i++) {
        //     this.colors[i] = color(Math.random(), Math.random(), Math.random(), 1.0);
        // }

        // Generate start_color with a broader range
        const start_color = color(0.5 - Math.random() * 0.5, 0.5 - Math.random() * 0.5, 0.5 - Math.random() * 0.5, 1.0);
        console.log(start_color);

        // Generate end_color with a broader range
        const end_color = color( 0.5 + Math.random() * 0.5, 0.5 + Math.random() * 0.5, 0.5 + Math.random() * 0.5, 1.0);
        console.log(end_color);

        for (let i = 0; i < 6; i++) {
            const t = i / (6 - 1); // Calculate a ratio between 0 and 1
    
            // Interpolate between start_color and end_color based on the ratio 't'
            const new_color = color(
                start_color[0] * (1 - t) + end_color[0] * t,
                start_color[1] * (1 - t) + end_color[1] * t,
                start_color[2] * (1 - t) + end_color[2] * t,
                1.0
            );
    
            this.colors[i] = new_color;
        }
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
        //this.shapes.torus.draw(context, program_state, model_transform, this.materials.test.override({color: yellow}));
        /*let tree_transform = Mat4.rotation(Math.PI/2, 1, 0, 0);
        for (let i = 0; i<5; i++) {
            this.shapes.cylinder.draw(context, program_state, tree_transform, this.materials.test);
            tree_transform.pre_multiply(Mat4.translation(5,0,0));
        }*/
        if (this.player.ifStarted){
            var shading = false;
        }else{
            var shading = true;
        }
        for (let i = 0; i < this.trees.length; i++){
            this.trees[i].draw(context, program_state, t, this.colors[i], shading);
        }

        if(this.gameOver) {
            this.player.draw(context, program_state);
            return;
        }
        for (let i = 0; i < this.tree_backgrounds.length; i++){
            this.tree_backgrounds[i].draw(context, program_state, t, this.colors[i], shading);
        }
        this.floor.draw(context, program_state);

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

// Gouraud Shader 
class Gouraud_Shader extends Shader {
    // This is a Shader using Phong_Shader as template

    constructor(num_lights = 2) {
        super();
        this.num_lights = num_lights;
    }

    shared_glsl_code() {
        // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return ` 
        precision mediump float;
        const int N_LIGHTS = ` + this.num_lights + `;
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform vec4 light_positions_or_vectors[N_LIGHTS], light_colors[N_LIGHTS];
        uniform float light_attenuation_factors[N_LIGHTS];
        uniform vec4 shape_color;
        uniform vec3 squared_scale, camera_center;

        // Specifier "varying" means a variable's final value will be passed from the vertex shader
        // on to the next phase (fragment shader), then interpolated per-fragment, weighted by the
        // pixel fragment's proximity to each of the 3 vertices (barycentric interpolation).
        varying vec3 N, vertex_worldspace;
        varying vec4 color; 

        // ***** PHONG SHADING HAPPENS HERE: *****                                       
        vec3 phong_model_lights( vec3 N, vec3 vertex_worldspace ){                                        
            // phong_model_lights():  Add up the lights' contributions.
            vec3 E = normalize( camera_center - vertex_worldspace );
            vec3 result = vec3( 0.0 );
            for(int i = 0; i < N_LIGHTS; i++){
                // Lights store homogeneous coords - either a position or vector.  If w is 0, the 
                // light will appear directional (uniform direction from all points), and we 
                // simply obtain a vector towards the light by directly using the stored value.
                // Otherwise if w is 1 it will appear as a point light -- compute the vector to 
                // the point light's location from the current surface point.  In either case, 
                // fade (attenuate) the light as the vector needed to reach it gets longer.  
                vec3 surface_to_light_vector = light_positions_or_vectors[i].xyz - 
                                               light_positions_or_vectors[i].w * vertex_worldspace;                                             
                float distance_to_light = length( surface_to_light_vector );

                vec3 L = normalize( surface_to_light_vector );
                vec3 H = normalize( L + E );
                // Compute the diffuse and specular components from the Phong
                // Reflection Model, using Blinn's "halfway vector" method:
                float diffuse  =      max( dot( N, L ), 0.0 );
                float specular = pow( max( dot( N, H ), 0.0 ), smoothness );
                float attenuation = 1.0 / (1.0 + light_attenuation_factors[i] * distance_to_light * distance_to_light );
                
                vec3 light_contribution = shape_color.xyz * light_colors[i].xyz * diffusivity * diffuse
                                                          + light_colors[i].xyz * specularity * specular;
                result += attenuation * light_contribution;
            }
            return result;
        } `;
    }

    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        return this.shared_glsl_code() + `
            attribute vec3 position, normal;                            
            // Position is expressed in object coordinates.
            
            uniform mat4 model_transform;
            uniform mat4 projection_camera_model_transform;
    
            void main(){                                                                   
                // The vertex's final resting place (in NDCS):
                gl_Position = projection_camera_model_transform * vec4( position, 1.0 );
                // The final normal vector in screen space.
                N = normalize( mat3( model_transform ) * normal / squared_scale);
                vertex_worldspace = ( model_transform * vec4( position, 1.0 ) ).xyz;
                // Added: calculate vertex's color 
                color = vec4(shape_color.xyz * ambient, shape_color.w);
                color.xyz += phong_model_lights(N, vertex_worldspace);
            } `;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // A fragment is a pixel that's overlapped by the current triangle.
        // Fragments affect the final image or get discarded due to depth.
        return this.shared_glsl_code() + `
            void main(){                                                           
                // Compute an initial (ambient) color:
                // gl_FragColor = vec4( shape_color.xyz * ambient, shape_color.w );
                // Compute the final color with contributions from lights:
                // gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
                gl_FragColor = color;
                return;
            } `;
    }

    send_material(gl, gpu, material) {
        // send_material(): Send the desired shape-wide material qualities to the
        // graphics card, where they will tweak the Phong lighting formula.
        gl.uniform4fv(gpu.shape_color, material.color);
        gl.uniform1f(gpu.ambient, material.ambient);
        gl.uniform1f(gpu.diffusivity, material.diffusivity);
        gl.uniform1f(gpu.specularity, material.specularity);
        gl.uniform1f(gpu.smoothness, material.smoothness);
    }

    send_gpu_state(gl, gpu, gpu_state, model_transform) {
        // send_gpu_state():  Send the state of our whole drawing context to the GPU.
        const O = vec4(0, 0, 0, 1), camera_center = gpu_state.camera_transform.times(O).to3();
        gl.uniform3fv(gpu.camera_center, camera_center);
        // Use the squared scale trick from "Eric's blog" instead of inverse transpose matrix:
        const squared_scale = model_transform.reduce(
            (acc, r) => {
                return acc.plus(vec4(...r).times_pairwise(r))
            }, vec4(0, 0, 0, 0)).to3();
        gl.uniform3fv(gpu.squared_scale, squared_scale);
        // Send the current matrices to the shader.  Go ahead and pre-compute
        // the products we'll need of the of the three special matrices and just
        // cache and send those.  They will be the same throughout this draw
        // call, and thus across each instance of the vertex shader.
        // Transpose them since the GPU expects matrices as column-major arrays.
        const PCM = gpu_state.projection_transform.times(gpu_state.camera_inverse).times(model_transform);
        gl.uniformMatrix4fv(gpu.model_transform, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
        gl.uniformMatrix4fv(gpu.projection_camera_model_transform, false, Matrix.flatten_2D_to_1D(PCM.transposed()));

        // Omitting lights will show only the material color, scaled by the ambient term:
        if (!gpu_state.lights.length)
            return;

        const light_positions_flattened = [], light_colors_flattened = [];
        for (let i = 0; i < 4 * gpu_state.lights.length; i++) {
            light_positions_flattened.push(gpu_state.lights[Math.floor(i / 4)].position[i % 4]);
            light_colors_flattened.push(gpu_state.lights[Math.floor(i / 4)].color[i % 4]);
        }
        gl.uniform4fv(gpu.light_positions_or_vectors, light_positions_flattened);
        gl.uniform4fv(gpu.light_colors, light_colors_flattened);
        gl.uniform1fv(gpu.light_attenuation_factors, gpu_state.lights.map(l => l.attenuation));
    }

    update_GPU(context, gpu_addresses, gpu_state, model_transform, material) {
        // update_GPU(): Define how to synchronize our JavaScript's variables to the GPU's.  This is where the shader
        // recieves ALL of its inputs.  Every value the GPU wants is divided into two categories:  Values that belong
        // to individual objects being drawn (which we call "Material") and values belonging to the whole scene or
        // program (which we call the "Program_State").  Send both a material and a program state to the shaders
        // within this function, one data field at a time, to fully initialize the shader for a draw.

        // Fill in any missing fields in the Material object with custom defaults for this shader:
        const defaults = {color: color(0, 0, 0, 1), ambient: 0, diffusivity: 1, specularity: 1, smoothness: 40};
        material = Object.assign({}, defaults, material);

        this.send_material(context, gpu_addresses, material);
        this.send_gpu_state(context, gpu_addresses, gpu_state, model_transform);
    }
}