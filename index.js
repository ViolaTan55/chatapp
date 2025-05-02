import { createApp } from "vue";
import { GraffitiLocal } from "@graffiti-garden/implementation-local";
import { GraffitiRemote } from "@graffiti-garden/implementation-remote";
import { GraffitiPlugin } from "@graffiti-garden/wrapper-vue";

const ProfileView = {
  props: {
    profile: {
      type: Object,
      required: true
    },
    isEditing: {
      type: Boolean,
      default: false
    }
  },
  template: `
    <div class="profile-view">
      <h2>My Profile</h2>
      <form v-if="isEditing" @submit.prevent="$emit('save')">
        <p><strong>Name:</strong></p>
        <input type="text" v-model="profile.name" placeholder="Name" />

        <p><strong>Email:</strong></p>
        <input type="text" v-model="profile.email" placeholder="Email" />

        <p><strong>Anonymized Name:</strong></p>
        <input type="text" v-model="profile.anonymized" placeholder="Anonymized Name" />

        <p><strong>Personal Boundaries:</strong></p>
        <div class="boundaries-container">
          <div class="boundaries-input" @click="$emit('start-edit')">
            <div class="selected-boundaries">
              <span v-for="boundary in profile.boundaries" :key="boundary" class="boundary-tag">
                {{ boundary }}
                <button @click.stop="$emit('remove-boundary', boundary)" class="remove-boundary">×</button>
              </span>
              <input 
                v-if="isEditing"
                type="text" 
                v-model="newBoundary" 
                placeholder="Add a new boundary"
                @keydown="handleBoundaryKeydown"
                @click.stop
              />
            </div>
          </div>
          <div v-if="isEditing" class="preset-boundaries">
            <button 
              v-for="boundary in presetBoundaries" 
              :key="boundary"
              @click.stop="$emit('add-boundary', boundary)"
              :disabled="profile.boundaries.includes(boundary)"
            >
              {{ boundary }}
            </button>
          </div>
        </div>
        <input type="submit" value="Save Profile" />
      </form>

      <div v-else>
        <p><strong>Name:</strong> {{ profile.name }}</p>
        <p><strong>Email:</strong> {{ profile.email }}</p>
        <p><strong>Anonymized Name:</strong> {{ profile.anonymized }}</p>
        <p><strong>Boundaries:</strong> 
          <span v-for="boundary in profile.boundaries" :key="boundary" class="boundary-tag">
            {{ boundary }}
          </span>
        </p>
        <button @click="$emit('start-edit')">✏️ Edit Profile</button>
      </div>
    </div>
  `,
  data() {
    return {
      newBoundary: "",
      presetBoundaries: [
        "No talking about my relationship",
        "No career talks",
        "No political discussions",
        "No religious discussions",
        "No family situations",
        "No medical situations",
      ]
    };
  },
  methods: {
    handleBoundaryKeydown(event) {
      if (event.key === 'Enter' && this.newBoundary.trim()) {
        event.preventDefault();
        this.$emit('add-boundary', this.newBoundary.trim());
        this.newBoundary = "";
      }
    }
  }
};

const app = createApp({
  components: {
    'profile-view': ProfileView
  },
  data() {
    return {
      myMessage: "",
      sending: false,
      channels: ["designftw"],
      groupChatName: "",
      creating: false,
      selectedChannel: null,
      groupChats: [],
      editingMessage: null,
      isAddingUser: false,
      userToAdd: "",
      showInvitationMessage: false,
      profile: {
        name: "",
        email: "",
        anonymized: "",
        boundaries: []
      },
      existingProfile: null,
      editingProfile: true,
      viewingProfile: false,
      selectedProfile: null,
      debug: {
        lastActor: null,
        lastError: null
      },
      presetBoundaries: [
        "No talking about my relationship",
        "No career talks",
        "No political discussions",
        "No religious discussions",
        "No family situations",
        "No medical situations",
      ],
      newBoundary: ""
    };
  },

  computed: {
    currentMessages() {
      try {
        const messages = this.$graffiti.get(this.channels);
        return Array.isArray(messages) ? messages : [];
      } catch (error) {
        console.warn('Error getting messages:', error);
        return [];
      }
    },
    currentGroupName() {
      const group = this.groupChats.find(chat => chat.channel === this.selectedChannel);
      return group ? group.name : 'Loading...';
    },
    messageChannels() {
      return this.selectedChannel ? [this.selectedChannel] : [];
    }
  },

  methods: {
    toggleProfileView() {
      this.viewingProfile = !this.viewingProfile;
      this.selectedChannel = null;
      
      if (this.viewingProfile) {
        if (this.existingProfile) {
          this.editingProfile = false;
        } else {
          this.profile = {
            name: "",
            email: "",
            anonymized: "",
            boundaries: []
          };
          this.editingProfile = true;
        }
      }
    },

    async viewUserProfile(actor) {
      if (actor === this.$graffitiSession.value.actor) {
        this.toggleProfileView();
      } else {
        const profile = await this.loadProfile(actor);
        this.selectedProfile = profile || {
          name: "(No profile found)",
          email: "",
          anonymized: "",
          boundaries: []
        };
        this.viewingProfile = true;
        this.editingProfile = false;
      }
    },
    

    addBoundary(boundary) {
      if (boundary && !this.profile.boundaries.includes(boundary)) {
        this.profile.boundaries.push(boundary);
      }
      this.newBoundary = "";
    },

    removeBoundary(boundary) {
      this.profile.boundaries = this.profile.boundaries.filter(b => b !== boundary);
    },

    handleBoundaryKeydown(event) {
      if (event.key === 'Enter' && this.newBoundary.trim()) {
        event.preventDefault();
        this.addBoundary(this.newBoundary.trim());
      }
    },

    startEditingProfile() {
      this.editingProfile = true;
      if (this.existingProfile) {
        this.profile = {
          name: this.existingProfile.name || "",
          email: this.existingProfile.email || "",
          anonymized: this.existingProfile.anonymized || "",
          boundaries: this.existingProfile.boundaries || []
        };
      }
    },
    

    async saveProfile(session) {
      try {
        const actor = session.actor;
        if (!actor) {
          console.warn('No actor in session when saving profile');
          return;
        }

        this.debug.lastActor = actor;
        console.log('Saving profile for actor:', actor);
    
        const profileObject = {
          value: {
            name: this.profile.name,
            email: this.profile.email,
            anonymized: this.profile.anonymized,
            boundaries: this.profile.boundaries,
            describes: actor,
            published: Date.now()
          },
          channels: ["designftw"]
        };
    
        console.log('Saving profile object:', profileObject);
        await this.$graffiti.put(profileObject, session);
        console.log('Profile saved successfully');
        
        this.existingProfile = profileObject.value;
        this.editingProfile = false;
      } catch (error) {
        console.error('Error saving profile:', error);
        this.debug.lastError = error;
      }
    },

    async loadProfile(actor) {
      try {
        if (!actor) {
          console.warn("No actor provided to loadProfile");
          return null;
        }
    
        let allObjects = this.$graffiti.get(["designftw"]);
    
        if (Array.isArray(allObjects)) {
          
        }else if (allObjects && typeof allObjects === "object") {
          allObjects = Object.values(allObjects);
        } else {
          allObjects = [];
        }
    
        const results = allObjects.filter(
          obj =>
            obj?.value?.describes === actor &&
            typeof obj.value?.name === "string"
        );
    
        if (results.length > 0) {
          const latest = results.sort((a, b) => b.value.published - a.value.published)[0];
          return latest.value;
        } else {
          return null;
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        return null;
      }
    }
    ,
    

    async sendMessage(session) {
      if (!this.myMessage || !this.selectedChannel) return;

      this.sending = true;

      await this.$graffiti.put(
        {
          value: {
            content: this.myMessage,
            published: Date.now(),
          },
          channels: [this.selectedChannel],
        },
        session,
      );

      this.sending = false;
      this.myMessage = "";

      await this.$nextTick();
      this.$refs.messageInput.focus();
    },

    async editMessage(message, session) {
      this.editingMessage = message;
      this.myMessage = message.value.content;
      await this.$nextTick();
      this.$refs.messageInput.focus();
    },

    async saveEdit(session) {
      if (!this.editingMessage || !this.myMessage) return;

      this.sending = true;

      await this.$graffiti.patch(
        {
          value: [
            {
              op: "replace",
              path: "/content",
              value: this.myMessage
            },
            {
              op: "replace",
              path: "/published",
              value: Date.now()
            }
          ]
        },
        this.editingMessage,
        session
      );

      this.sending = false;
      this.myMessage = "";
      this.editingMessage = null;

      await this.$nextTick();
      this.$refs.messageInput.focus();
    },

    async deleteMessage(message, session) {
      if (!message) return;

      await this.$graffiti.delete(message.url, session);
    },

    async createGroupChat(session) {
      if (!this.groupChatName) return;
      this.creating = true;

      const newChannel = `group-${Date.now()}`;

      await this.$graffiti.put(
        {
          value: {
            activity: 'Create',
            object: {
              type: 'Group Chat',
              name: this.groupChatName,
              channel: newChannel,
            },
          },
          channels: ["designftw"],
        },
        session
      );
      
      this.groupChats.push({
        name: this.groupChatName,
        channel: newChannel
      });
      
      this.creating = false;
      this.groupChatName = "";
      await this.$nextTick();
      this.$refs.nameInput.focus();
    },

    startAddingUser() {
      this.isAddingUser = true;
      this.userToAdd = "";
    },

    async addUserToGroup(session) {
      if (!this.userToAdd || !this.selectedChannel) return;

      await this.$graffiti.put(
        {
          value: {
            activity: "Add",
            object: this.userToAdd,
            target: this.selectedChannel
          },
          channels: ["designftw"],
        },
        session
      );

      this.isAddingUser = false;
      this.userToAdd = "";
      
      this.showInvitationMessage = true;
      setTimeout(() => {
        this.showInvitationMessage = false;
      }, 3000);
    },

    selectGroupChat(channel) {
      this.selectedChannel = channel;
    },

    exitGroupChat() {
      this.selectedChannel = null;
    },

    updateGroupChats(groupchatObjects) {
      this.groupChats = groupchatObjects.map(obj => ({
        name: obj.value.object.name,
        channel: obj.value.object.channel
      }));
    }
  },
  mounted() {
    const actor = this.$graffitiSession.value?.actor;
    if (actor) {
      this.loadProfile(actor).then(profile => {
        this.existingProfile = profile;
      });
    }
  }
  
  
});

app.directive("focus", {
  mounted(el) {
    el.focus();
  },
});

app.use(GraffitiPlugin, {
  graffiti: new GraffitiLocal(),
  // graffiti: new GraffitiRemote(),
})
app.mount("#app");
