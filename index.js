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
    },
    isOwnProfile: {
      type: Boolean,
      default: true
    },
    isAnonymous: {
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
        <p v-if="isOwnProfile"><strong>Name:</strong> {{ profile.name }}</p>
        <p v-if="isOwnProfile"><strong>Email:</strong> {{ profile.email }}</p>
        <p v-if="isOwnProfile"><strong>Anonymized Name:</strong> {{ profile.anonymized }}</p>
        <p v-if="!isOwnProfile"><strong>Name:</strong> {{ isAnonymous ? profile.anonymized : profile.name }}</p>
        <p><strong>Boundaries:</strong> 
          <span v-for="boundary in profile.boundaries" :key="boundary" class="boundary-tag">
            {{ boundary }}
          </span>
        </p>
        <button v-if="isOwnProfile" @click="$emit('start-edit')">🖊️ Edit Profile</button>
        <button v-if="isOwnProfile" @click="$graffiti.logout($graffitiSession.value)">👋 Log Out</button>
      </div>
    </div>
  `,
  data() {
    return {
      newBoundary: "",
      presetBoundaries: [
        "No relationship talks",
        "No career talks",
        "No political discussions",
        "No religious discussions",
        "No family situations",
        "No medical situations",
      ],
      allGroups: []
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
        boundaries: [],
        groups: []
      },
      existingProfile: null,
      editingProfile: false,
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
        "No relationship talks",
        "No career talks",
        "No political discussions",
        "No religious discussions",
        "No family situations",
        "No medical situations",
      ],
      newBoundary: "",
      creatingNewProfile: false,
      profileLoading: false,
      currentProfileId: null,
      profilesById: {},
      pendingInviteGroupId: null,
      showJoinInvitePrompt: false,
      pendingInviteGroupName: "",
      allGroups: [],
      groupBoundaries: [],
      newGroupBoundary: "",
      currentGroupBoundaries: [],
      showBoundaryComparison: false,
      pendingGroupJoin: null,
      boundaryDifferences: [],
      isAnonymousGroup: false,
      currentGroupIsAnonymous: false
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
        boundaries: [],
        groups: []
      };
    },

    async selectProfile(profileObj) {
      console.log('Selecting profile:', profileObj);
      this.existingProfile = profileObj;
      this.currentProfileId = profileObj.url;
      this.profile = {
        name: profileObj.value.name || "",
        email: profileObj.value.email || "",
        anonymized: profileObj.value.anonymized || "",
        boundaries: profileObj.value.boundaries || [],
        groups: profileObj.value.groups || []
      };
      console.log('Current profile after selection:', this.profile);
      this.newAccountSetup = false;
      this.viewingInvitations = false;

      // get group objects from graffitis discover
      let groupchatObjects = [];
      try {
        const groupDiscover = this.$refs.groupDiscover;
        if (groupDiscover && groupDiscover.objects) {
          groupchatObjects = groupDiscover.objects.filter(obj =>
            obj.value &&
            obj.value.activity === 'create' &&
            obj.value.object &&
            obj.value.object.type === 'group'
          );
        }
      } catch (e) {
        console.warn("Error fetching group objects from discover:", e);
      }
      this.updateGroupChats(groupchatObjects);

      if (this.pendingInviteGroupId) {
        this.showJoinInvitePrompt = true;
      }
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
            published: Date.now(),
            groups: this.profile.groups
          },
          channels: ["designftw"]
        };
        
        console.log('Saving profile:', profileObject);
        await this.$graffiti.put(profileObject, this.$graffitiSession.value);
        console.log('Profile saved successfully');
        
        // back to profile selection page
        this.creatingNewProfile = false;
        this.newAccountSetup = true;
        // clear the profile form
        this.profile = {
          name: "",
          email: "",
          anonymized: "",
          boundaries: [],
          groups: []
        };
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
    
        const profileData = {
          name: this.profile.name,
          email: this.profile.email,
          anonymized: this.profile.anonymized,
          boundaries: this.profile.boundaries,
          generator: "https://violatan55.github.io/chatapp/",
          describes: actor,
          published: Date.now(),
          groups: this.profile.groups
        };

        if (this.existingProfile) {
          // Editing existing profile - use patch
          console.log('Patching existing profile');
          await this.$graffiti.patch(
            {
              value: [
                { op: "replace", path: "/name", value: profileData.name },
                { op: "replace", path: "/email", value: profileData.email },
                { op: "replace", path: "/anonymized", value: profileData.anonymized },
                { op: "replace", path: "/boundaries", value: profileData.boundaries },
                { op: "replace", path: "/published", value: profileData.published },
                { op: "replace", path: "/groups", value: profileData.groups }
              ]
            },
            this.existingProfile,
            session
          );
          this.existingProfile.value = profileData;
        } else {
          console.log('Creating new profile');
          const profileObject = {
            value: profileData,
            channels: ["designftw", "designftw-2025-studio2"]
          };
          await this.$graffiti.put(profileObject, session);
        }
    
        console.log('Profile saved successfully');
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
        let allObjects;
        // try {
        //   allObjects = await this.$graffiti.get(['designftw']);
        //   console.log('All objects in designftw:', allObjects);
        // } catch (err) {
        //   console.error('Error in graffiti.get:', err);
        //   this.joinGroupError = "Error loading group data. Please contact support.";
        //   return;
        // }
    
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
              channel: groupId,
              creator: this.currentProfileId,
              createdAt: Date.now(),
              members: [this.currentProfileId],
              boundaries: this.groupBoundaries,
              isAnonymous: this.isAnonymousGroup
            }
          },
          channels: ["designftw"]
        };
        
        console.log('Creating group:', groupObject);
        await this.$graffiti.put(groupObject, session);
        
        this.selectedGroup = {
          id: groupId,
          name: this.groupChatName
        };
        
        this.generateInviteLink(groupId);
        this.groupChatName = "";
        this.groupBoundaries = [];
        this.isAnonymousGroup = false;
        this.creatingGroup = false;

        
        if (!this.profile.groups) this.profile.groups = [];
        if (!this.profile.groups.includes(groupId)) {
          this.profile.groups.push(groupId);
          await this.$graffiti.patch(
            {
              value: [
                { op: "add", path: "/groups", value: this.profile.groups }
              ]
            },
            this.existingProfile,
            this.$graffitiSession.value
          );
        }
      } catch (error) {
        console.error('Error creating group:', error);
      } finally {
        this.creating = false;
      }
    },

    generateInviteLink(groupId) {
      
      const url = new URL(window.location.href);
      url.searchParams.set('invite', groupId);
      this.inviteLink = url.toString();
    },

    generateGroupInviteLink() {
      if (this.selectedChannel) {
        this.generateInviteLink(this.selectedChannel);
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
        let inviteId;
        try {
          const url = new URL(this.groupInviteLink);
          inviteId = url.searchParams.get('invite');
          console.log('Invite ID:', inviteId);
        } catch (e) {
          inviteId = this.groupInviteLink;
        }
        
        if (!inviteId) {
          this.joinGroupError = "Invalid invite link";
          return;
        }

        const groupInfo = this.allGroups.filter(
          obj =>
            obj?.value?.object?.channel === inviteId &&
            obj?.value?.object?.type === 'group'
        );

        console.log('groupInfo[0]:', groupInfo[0]);
        console.log('groupInfo[0].url:', groupInfo[0]?.url);

        if (!groupInfo || groupInfo.length === 0) {
          this.joinGroupError = "Group not found";
          return;
        }

        const group = groupInfo[0].value.object;

        if (group.members && group.members.includes(this.currentProfileId)) {
          this.joinGroupError = "Already a member of this group";
          return;
        }

        const differences = this.compareBoundaries(this.profile.boundaries, group.boundaries || []);
        
        if (differences.length > 0) {
          // store the group info and differences for the comparison view
          this.pendingGroupJoin = {
            group: group,
            groupInfo: groupInfo[0]
          };
          this.boundaryDifferences = differences;
          this.showBoundaryComparison = true;
          return;
        }

        // if no differences, proceed with joining
        await this.completeGroupJoin(group, groupInfo[0]);
      } catch (error) {
        console.error('Error joining group:', error);
        this.joinGroupError = "Error joining group. Please try again.";
      }
    },

    async completeGroupJoin(group, groupInfo) {
      try {
        // Add profile to group members
        const updatedMembers = [...(group.members || []), this.currentProfileId];
        await this.$graffiti.patch(
          {
            value: [
              { op: "replace", path: "/object/members", value: updatedMembers }
            ]
          },
          groupInfo.url,
          this.$graffitiSession.value
        );

        // Select the newly joined group
        this.selectGroupChat(group.channel, group.name || group.channel);

        // Update profile with new group
        if (!this.profile.groups) this.profile.groups = [];
        if (!this.profile.groups.includes(group.channel)) {
          this.profile.groups.push(group.channel);
          await this.$graffiti.patch(
            {
              value: [
                { op: "add", path: "/groups", value: this.profile.groups }
              ]
            },
            this.existingProfile,
            this.$graffitiSession.value
          );
        }

        // Reset all join-related states
        this.showJoinGroup = false;
        this.groupInviteLink = "";
        this.joinGroupError = "";
        this.showBoundaryComparison = false;
        this.pendingGroupJoin = null;
        this.boundaryDifferences = [];
        this.showJoinInvitePrompt = false;
        this.pendingInviteGroupId = null;
        this.pendingInviteGroupName = "";
      } catch (error) {
        console.error('Error completing group join:', error);
        this.joinGroupError = "Error joining group. Please try again.";
      }
    },

    clearJoinStates() {
      this.showJoinInvitePrompt = false;
      this.pendingInviteGroupId = null;
      this.pendingInviteGroupName = "";
      this.showJoinGroup = false;
      this.groupInviteLink = "";
      this.joinGroupError = "";
      this.showBoundaryComparison = false;
      this.pendingGroupJoin = null;
      this.boundaryDifferences = [];
    },

    cancelGroupJoin() {
      this.clearJoinStates();
    },

    
    compareBoundaries(personalBoundaries, groupBoundaries) {
      const differences = [];
      
      
      const groupOnly = groupBoundaries.filter(b => !personalBoundaries.includes(b));
      if (groupOnly.length > 0) {
        differences.push({
          type: 'group_only',
          boundaries: groupOnly
        });
      }
      
      
      const personalOnly = personalBoundaries.filter(b => !groupBoundaries.includes(b));
      if (personalOnly.length > 0) {
        differences.push({
          type: 'personal_only',
          boundaries: personalOnly
        });
      }
      
      return differences;
    },

    
    createBoundaryComparisonMessage(differences) {
      let message = "This group has different boundaries than your personal boundaries:\n\n";
      
      differences.forEach(diff => {
        if (diff.type === 'group_only') {
          message += "The group has these additional boundaries:\n";
          diff.boundaries.forEach(b => message += `- ${b}\n`);
        } else if (diff.type === 'personal_only') {
          message += "Your personal boundaries that aren't in the group:\n";
          diff.boundaries.forEach(b => message += `- ${b}\n`);
        }
        message += "\n";
      });
      
      message += "Do you want to join this group anyway?";
      return message;
    },

    async handleInviteLink() {
      const urlParams = new URLSearchParams(window.location.search);
      const inviteId = urlParams.get('invite');
      console.log('Checking invite link, inviteId:', inviteId);
      
      if (inviteId) {
        this.pendingInviteGroupId = inviteId;
        
        const groupInfo = this.allGroups.find(obj => 
          obj.value.object?.channel === inviteId && 
          obj.value.object?.type === 'group'
        );
        
        if (groupInfo) {
          this.pendingInviteGroupName = groupInfo.value.object.name;
          console.log('Found group:', this.pendingInviteGroupName);
          
          if (groupInfo.value.object.members?.includes(this.currentProfileId)) {
            console.log('User is already a member of this group');
            this.joinGroupError = "You are already a member of this group";
            this.showJoinInvitePrompt = false;
            return;
          }
          
          if (this.$graffitiSession.value && this.currentProfileId) {
            console.log('Showing join prompt for group:', this.pendingInviteGroupName);
            this.showJoinInvitePrompt = true;
          } else {
            console.log('Waiting for session/profile before showing join prompt');
          }
        } else {
          console.log('Group not found in available groups');
          this.pendingInviteGroupName = inviteId;
        }
      }
    },

    async toggleProfileView() {
      this.viewingProfile = !this.viewingProfile;
      this.selectedChannel = null;

      if (this.viewingProfile) {
        if (this.editingProfile) {
          // already handled by startEditingProfile
          return;
        }
        this.profileLoading = true;
        await this.loadCurrentProfileForDisplay();
        this.profileLoading = false;
      }
    },

    toggleCreatingGroup() {
      this.creatingGroup = !this.creatingGroup;
      if (!this.creatingGroup) {
        this.groupChatName = "";
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
          boundaries: [],
          groups: []
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
          name: this.existingProfile.value.name || "",
          email: this.existingProfile.value.email || "",
          anonymized: this.existingProfile.value.anonymized || "",
          boundaries: this.existingProfile.value.boundaries || [],
          groups: this.existingProfile.value.groups || []
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
            isRumor: false,
            profileId: this.currentProfileId
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
        await this.$graffiti.patch(
          {
            value: [
              {
                op: "replace",
                path: "/isRumor",
                value: !message.value.isRumor
              }
            ]
          },
          message,
          session
        );
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
      this.groupChatName = name;
      

      const groupInfo = this.allGroups.find(obj => 
        obj.value.object?.channel === channel && 
        obj.value.object?.type === 'group'
      );
      
      if (groupInfo) {
        this.currentGroupBoundaries = groupInfo.value.object.boundaries || [];
        this.currentGroupIsAnonymous = groupInfo.value.object.isAnonymous || false;
      } else {
        this.currentGroupBoundaries = [];
        this.currentGroupIsAnonymous = false;
      }
    },

    exitGroupChat() {
      this.selectedChannel = null;
      this.showInviteLink = false;
    },

    async updateGroupChats(groupchatObjects) {
      console.log('Updating group chats with:', groupchatObjects);
      this.groupchatObjects = groupchatObjects;

      this.groupChats = groupchatObjects
        .filter(obj => {
          const isGroup = obj.value.activity === 'create' && obj.value.object?.type === 'group';
          const isMember = obj.value.object?.members?.includes(this.currentProfileId);
          return isGroup && isMember;
        })
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
        boundaries: [],
        groups: []
      };
    },

    updateAvailableProfiles(profileObjects) {
      // console.log('Profile objects updated:', profileObjects);
      this.profilesById = {};
      for (const obj of profileObjects) {
        if (obj.url) {
          this.profilesById[obj.url] = obj.value;
        }
      }
      // console.log('Profiles by ID:', this.profilesById);
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
    },

    async loadCurrentProfileForDisplay() {
      const actor = this.$graffitiSession.value?.actor;
      if (actor) {
        const loadedProfile = await this.loadProfile(actor);
        if (loadedProfile) {
          this.existingProfile = { value: loadedProfile };
          this.profile = {
            name: loadedProfile.name || "",
            email: loadedProfile.email || "",
            anonymized: loadedProfile.anonymized || "",
            boundaries: loadedProfile.boundaries || [],
            groups: loadedProfile.groups || []
          };
        }
      }
    },

    //helper to get object.value
    getObjectValue(object) {
      console.log('Object:', object);
      return object.value;
    },

    // Helper to get display name for a message sender
    getProfileDisplayName(profileId, actor) {
      const profile = this.profilesById[profileId];
      if (profile) {
        if (this.currentGroupIsAnonymous) {
          return profile.anonymized || actor;
        }
        return profile.name || profile.anonymized || actor;
      }
      return actor;
    },


    getIsMyMessage(message) {
      return message.value && message.value.profileId && message.value.profileId === this.currentProfileId;
    },


    getProfileById(profileId) {
      return this.profilesById[profileId] || null;
    },

    viewUserProfileById(profileId) {
      const profile = this.getProfileById(profileId);
      if (profile) {
        this.selectedProfile = profile;
        this.viewingProfile = true;
        this.editingProfile = false;
      } else {
        this.selectedProfile = {
          name: "(No profile found)",
          email: "",
          anonymized: "",
          boundaries: [],
          groups: []
        };
        this.viewingProfile = true;
        this.editingProfile = false;
      }
    },

    // async leaveGroup(groupId) {
    //   try {
    //     // Get group info
    //     const groupInfo = await this.$graffiti.get(['designftw'], {
    //       filter: (obj) => obj.value.object?.channel === groupId && obj.value.object?.type === 'group'
    //     });

    //     if (groupInfo && groupInfo.length > 0) {
    //       const group = groupInfo[0].value.object;
          
    //       // Remove profile from members
    //       if (group.members) {
    //         const updatedMembers = group.members.filter(id => id !== this.currentProfileId);
    //         await this.$graffiti.patch(
    //           {
    //             value: [
    //               { op: "replace", path: "/object/members", value: updatedMembers }
    //             ]
    //           },
    //           groupInfo[0],
    //           this.$graffitiSession.value
    //         );
    //       }
    //     }

    //     // Remove group from profile
    //     if (this.profile.groups) {
    //       this.profile.groups = this.profile.groups.filter(g => g !== groupId);
    //       await this.$graffiti.patch(
    //         {
    //           value: [
    //             { op: "replace", path: "/groups", value: this.profile.groups }
    //           ]
    //         },
    //         this.existingProfile,
    //         this.$graffitiSession.value
    //       );
    //     }

    //     // If currently viewing this group, exit it
    //     if (this.selectedChannel === groupId) {
    //       this.exitGroupChat();
    //     }

    //     // Update group chats list
    //     this.groupChats = this.groupChats.filter(g => g.channel !== groupId);
    //   } catch (error) {
    //     console.error('Error leaving group:', error);
    //   }
    // },

    async joinPendingInviteGroup() {
      if (!this.pendingInviteGroupId) return;
      
      console.log('Joining pending invite group:', this.pendingInviteGroupId);
      
      // Find the group in allGroups
      const groupInfo = this.allGroups.find(obj => 
        obj.value.object?.channel === this.pendingInviteGroupId && 
        obj.value.object?.type === 'group'
      );
      
      if (!groupInfo) {
        console.error('Group not found in available groups');
        return;
      }
      
      const differences = this.compareBoundaries(this.profile.boundaries, groupInfo.value.object.boundaries || []);
      
      if (differences.length > 0) {
        // store group info and differences for comparison
        this.pendingGroupJoin = {
          group: groupInfo.value.object,
          groupInfo: groupInfo
        };
        this.boundaryDifferences = differences;
        this.showBoundaryComparison = true;
        this.showJoinInvitePrompt = false;
        return;
      }
      
      // if no differences, proceed with joining
      await this.completeGroupJoin(groupInfo.value.object, groupInfo);
      this.showJoinInvitePrompt = false;
      this.pendingInviteGroupId = null;
      this.pendingInviteGroupName = "";
    },

    updateAvailableGroups(groupObjects) {
      console.log('Updating available groups:', groupObjects);
      this.allGroups = groupObjects.filter(obj => 
        obj.value?.activity === 'create' && 
        obj.value?.object?.type === 'group'
      );
      console.log('Filtered groups:', this.allGroups);

      if (this.pendingInviteGroupId) {
        this.handleInviteLink();
      }
    },

    addGroupBoundary(boundary) {
      if (boundary && !this.groupBoundaries.includes(boundary)) {
        this.groupBoundaries.push(boundary);
      }
      this.newGroupBoundary = "";
    },

    removeGroupBoundary(boundary) {
      this.groupBoundaries = this.groupBoundaries.filter(b => b !== boundary);
    },

    handleGroupBoundaryKeydown(event) {
      if (event.key === 'Enter' && this.newGroupBoundary.trim()) {
        event.preventDefault();
        this.addGroupBoundary(this.newGroupBoundary.trim());
      }
    }
  },
  watch: {
    currentProfileId(newVal) {
      if (newVal && this.pendingInviteGroupId) {
        this.showJoinInvitePrompt = true;
      }
    }
  },
  mounted() {
    console.log('App mounted, checking session...');
    const actor = this.$graffitiSession.value?.actor;
    console.log('Current actor:', actor);

    console.log('Session:', this.$graffitiSession.value);
    console.log('Current profile ID:', this.currentProfileId);
    
    this.handleInviteLink();
  },
  
});

app.directive("focus", {
  mounted(el) {
    el.focus();
  },
});

app.use(GraffitiPlugin, {
  //graffiti: new GraffitiLocal(),
  graffiti: new GraffitiRemote(),
})
app.mount("#app");
