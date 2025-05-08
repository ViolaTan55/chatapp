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
      <!-- <h2>My Profile</h2> -->
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
        <input type="submit" value="💾 Save Profile" />
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
        <button @click="$emit('start-edit')">🖊️ Edit Profile</button>
        <button @click="$graffiti.logout($graffitiSession.value)">👋 Log Out</button>
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
      newAccountSetup: true,
      viewingInvitations: false,
      myMessage: "",
      sending: false,
      channels: ["designftw"],
      groupChatName: "",
      creating: false,
      selectedChannel: null,
      groupChats: [],
      groupchatObjects: [],
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
      creatingGroup: false,
      selectedGroup: null,
      showInviteLink: false,
      inviteLink: "",
      showCopiedMessage: false,
      showJoinGroup: false,
      groupInviteLink: "",
      joinGroupError: "",
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
      newBoundary: "",
      creatingNewProfile: false
    };
  },

  computed: {
    currentMessages() {
      try {
        const messages = this.$graffiti.get(this.messageChannels);
        return Array.isArray(messages) ? messages : [];
      } catch (error) {
        console.warn('Error getting messages:', error);
        return [];
      }
    },
    currentGroupName() {
      if (!this.selectedChannel) return '';

      return this.groupChatName;
    },
    messageChannels() {
      return this.selectedChannel ? [this.selectedChannel] : [];
    }
  },

  methods: {

    showProfileCreation() {
      console.log('Showing profile creation form');
      this.creatingNewProfile = true;
      this.profile = {
        name: "",
        email: "",
        anonymized: "",
        boundaries: []
      };
    },

    selectProfile(profile) {
      console.log('Selecting profile:', profile);
      this.existingProfile = profile;
      this.profile = {
        name: profile.name || "",
        email: profile.email || "",
        anonymized: profile.anonymized || "",
        boundaries: profile.boundaries || []
      };
      this.newAccountSetup = false;
      this.viewingInvitations = true;
    },

    async setupNewAccount() {
      try {
        console.log('Setting up new account...');
        const actor = this.$graffitiSession.value.actor;
        console.log('Actor for new account:', actor);
        
        const profileObject = {
          value: {
            name: this.profile.name,
            email: this.profile.email,
            anonymized: this.profile.anonymized,
            boundaries: this.profile.boundaries,
            generator: "https://violatan55.github.io/chatapp/",
            describes: actor,
            published: Date.now()
          },
          channels: ["designftw"]
        };
        
        console.log('Saving profile:', profileObject);
        await this.$graffiti.put(profileObject, this.$graffitiSession.value);
        console.log('Profile saved successfully');
        
        this.existingProfile = profileObject.value;
        this.creatingNewProfile = false;
        this.newAccountSetup = false;
        this.viewingInvitations = true;
      } catch (error) {
        console.error('Error in setupNewAccount:', error);
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
            generator: "https://violatan55.github.io/chatapp/",
            describes: actor,
            published: Date.now()
          },
          channels: ["designftw","designftw-2025-studio2"]
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
    
        console.log('Loading profile for actor:', actor);
        const allObjects = await this.$graffiti.get(["designftw"]);
        console.log('Retrieved objects:', allObjects);
    
        if (Array.isArray(allObjects)) {
          const results = allObjects.filter(
            obj =>
              obj?.value?.describes === actor &&
              typeof obj.value?.name === "string"
          );
    
          if (results.length > 0) {
            const latest = results.sort((a, b) => b.value.published - a.value.published)[0];
            console.log('Found profile:', latest.value);
            return latest.value;
          }
        }
        console.log('No profile found');
        return null;
      } catch (error) {
        console.error("Error loading profile:", error);
        return null;
      }
    },

    toggleInvitationsView() {
      this.viewingInvitations = !this.viewingInvitations;
      this.selectedChannel = null;
      this.creatingGroup = false;
      this.selectedGroup = null;
    },

    async acceptInvitation(invite) {
      try {
        await this.$graffiti.publish({
          channel: invite.value.groupId,
          value: {
            type: 'join',
            actor: this.$graffitiSession.value.actor,
            timestamp: Date.now()
          }
        });
        // Remove the invitation
        await this.$graffiti.delete(invite.url);
      } catch (error) {
        console.error('Error accepting invitation:', error);
      }
    },

    async declineInvitation(invite) {
      try {
        await this.$graffiti.delete(invite.url);
      } catch (error) {
        console.error('Error declining invitation:', error);
      }
    },

    async createGroupChat(session) {
      if (!this.groupChatName.trim()) return;
      
      this.creating = true;
      try {
        const groupId = `group_${Date.now()}`;
        const groupObject = {
          value: {
            activity: 'create',
            object: {
              type: 'group',
              name: this.groupChatName,
              channel: groupId
            }
          },
          channels: ["designftw"]
        };
        
        console.log('Creating group:', groupObject);
        await this.$graffiti.put(groupObject, session);
        
        // Add the new group to groupChats array
        this.groupChats.push({
          name: this.groupChatName,
          channel: groupId
        });
        
        this.selectedGroup = {
          id: groupId,
          name: this.groupChatName
        };
        
        this.generateInviteLink(groupId);
        this.groupChatName = "";
        this.creatingGroup = false;
      } catch (error) {
        console.error('Error creating group:', error);
      } finally {
        this.creating = false;
      }
    },

    generateInviteLink(groupId) {
      const baseUrl = window.location.origin + window.location.pathname;
      this.inviteLink = `${baseUrl}?invite=${groupId}`;
    },

    generateGroupInviteLink() {
      if (this.selectedChannel) {
        const baseUrl = window.location.origin + window.location.pathname;
        this.inviteLink = `${baseUrl}?invite=${this.selectedChannel}`;
        this.showInviteLink = true;
      }
    },

    async copyInviteLink() {
      try {
        const input = this.$refs.inviteLinkInput;
        input.select();
        await navigator.clipboard.writeText(this.inviteLink);
        this.showCopiedMessage = true;
        setTimeout(() => {
          this.showCopiedMessage = false;
          this.showInviteLink = false;
        }, 2000);
      } catch (error) {
        console.error('Error copying link:', error);
      }
    },

    toggleJoinGroup() {
      this.showJoinGroup = !this.showJoinGroup;
      this.groupInviteLink = "";
      this.joinGroupError = "";
    },

    async joinGroupFromLink() {
      try {
        const url = new URL(this.groupInviteLink);
        const inviteId = url.searchParams.get('invite');
        
        if (!inviteId) {
          this.joinGroupError = "Invalid invite link";
          return;
        }

        // Check if group exists
        const groupInfo = await this.$graffiti.get(['designftw'], {
          filter: (obj) => obj.value.object?.channel === inviteId
        });

        if (!groupInfo || groupInfo.length === 0) {
          this.joinGroupError = "Group not found";
          return;
        }

        const group = groupInfo[0].value.object;
        
        // Add user to group
        await this.$graffiti.put(
          {
            value: {
              type: 'join',
              actor: this.$graffitiSession.value.actor,
              timestamp: Date.now()
            },
            channels: [inviteId]
          },
          this.$graffitiSession.value
        );

        // Add group to user's list
        this.groupChats.push({
          name: group.name,
          channel: inviteId
        });

        this.showJoinGroup = false;
        this.groupInviteLink = "";
        this.joinGroupError = "";
        
        this.selectGroupChat(inviteId);
      } catch (error) {
        console.error('Error joining group:', error);
        this.joinGroupError = "Error joining group. Please try again.";
      }
    },

    async handleInviteLink() {
      const urlParams = new URLSearchParams(window.location.search);
      const inviteId = urlParams.get('invite');
      
      if (inviteId) {
        try {
          const groupInfo = await this.$graffiti.get(['designftw'], {
            filter: (obj) => obj.value.object?.channel === inviteId
          });
          
          if (groupInfo && groupInfo.length > 0) {
            const group = groupInfo[0].value.object;
            
            // Check if user is already in the group
            const existingGroup = this.groupChats.find(g => g.channel === inviteId);
            if (existingGroup) {
              this.selectGroupChat(inviteId);
              return;
            }

            // Add user to group
            await this.$graffiti.put(
              {
                value: {
                  type: 'join',
                  actor: this.$graffitiSession.value.actor,
                  timestamp: Date.now()
                },
                channels: [inviteId]
              },
              this.$graffitiSession.value
            );

            // Add group to user's list
            this.groupChats.push({
              name: group.name,
              channel: inviteId
            });

            // Select the newly joined group
            this.selectGroupChat(inviteId);
          }
        } catch (error) {
          console.error('Error handling invite link:', error);
        }
      }
    },

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

    toggleCreatingGroup() {
      this.creatingGroup = !this.creatingGroup;
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
    

    async sendMessage(session) {
      if (!this.myMessage.trim()) return;
      this.sending = true;
      try {
        const messageObject = {
          value: {
            content: this.myMessage,
            published: Date.now(),
            isRumor: false
          },
          channels: this.messageChannels
        };
        await this.$graffiti.put(messageObject, session);
        this.myMessage = "";
      } catch (error) {
        console.error('Error sending message:', error);
      } finally {
        this.sending = false;
      }
    },

    async toggleRumor(message, session) {
      try {
        const updatedMessage = {
          value: {
            ...message.value,
            isRumor: !message.value.isRumor
          },
          channels: this.messageChannels
        };
        await this.$graffiti.put(updatedMessage, session);
      } catch (error) {
        console.error('Error toggling rumor status:', error);
      }
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

    selectGroupChat(channel, name) {
      console.log('Selecting group chat:', channel);
      this.selectedChannel = channel;
      //const group = this.groupChats.find(chat => chat.channel === channel);
      
     //console.log('Found group:', group);
      this.groupChatName = name;
    },

    exitGroupChat() {
      this.selectedChannel = null;
      this.showInviteLink = false;
    },

    async updateGroupChats(groupchatObjects) {
      console.log('Updating group chats with:', groupchatObjects);
      this.groupchatObjects = groupchatObjects;
      
      // Save each group to the remote server
      for (const obj of groupchatObjects) {
        if (obj.value.activity === 'create' && obj.value.object?.type === 'group') {
          try {
            await this.$graffiti.put(obj, this.$graffitiSession.value);
            console.log('Saved group to remote:', obj);
          } catch (error) {
            console.error('Error saving group to remote:', error);
          }
        }
      }
      
      this.groupChats = groupchatObjects
        .filter(obj => obj.value.activity === 'create' && obj.value.object?.type === 'group')
        .map(obj => ({
        name: obj.value.object.name,
        channel: obj.value.object.channel
      }));
      console.log('Updated groupChats:', this.groupChats);
    },

    createNewProfile() {
      console.log('Creating new profile');
      this.profile = {
        name: "",
        email: "",
        anonymized: "",
        boundaries: []
      };
    },

    updateAvailableProfiles(profileObjects) {
      console.log('Profile objects updated:', profileObjects);
      const actor = this.$graffitiSession.value?.actor;
      if (!actor) return;

      // Filter profiles for this actor
      const myProfiles = profileObjects.filter(obj => 
        obj.value && obj.value.describes === actor
      );

      console.log('My profiles:', myProfiles);
    },

    async deleteProfile(profileObj) {
      try {
        console.log('Deleting profile:', profileObj);
        if (confirm('Are you sure you want to delete this profile?')) {
          await this.$graffiti.delete(profileObj.url, this.$graffitiSession.value);
          console.log('Profile deleted successfully');
        }
      } catch (error) {
        console.error('Error deleting profile:', error);
      }
    }
  },
  mounted() {
    console.log('App mounted, checking session...');
    const actor = this.$graffitiSession.value?.actor;
    console.log('Current actor:', actor);
    
    
    this.handleInviteLink();
  }
  
  
});

app.directive("focus", {
  mounted(el) {
    el.focus();
  },
});

app.use(GraffitiPlugin, {
  // graffiti: new GraffitiLocal(),
  graffiti: new GraffitiRemote(),
})
app.mount("#app");
